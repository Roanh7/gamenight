-- Historische seizoenen beschermen 📜
--  * Een potje hoort bij het seizoen waarin het voor het EERST werd afgerond. Wordt het later
--    heropend en opnieuw afgerond (correctie), dan krijgt het zijn oorspronkelijke afrondmoment terug
--    (matches.original_finished_at). Zo verhuist een oude uitslag nooit naar het huidige seizoen.
--  * Iets veranderen aan een AFGELOPEN seizoen (potje heropenen, heropend potje weggooien, avond
--    verwijderen) kan alleen na een bewuste bevestiging: de app vraagt eerst een tijdelijke toestemming
--    (public.allow_history_change, 5 minuten geldig, alleen voor de host/co-host). Zonder die toestemming
--    weigert de database het.
--  * Elke bewuste historische correctie komt als bericht in het nieuws, zodat iedereen het ziet.
--  * Oefenavonden tellen nergens mee en zijn dus niet beschermd.

alter table public.matches add column if not exists original_finished_at timestamptz;

-- Tijdelijke toestemmingen (alleen voor de database zelf; niet via de app te lezen of te schrijven)
create table if not exists private.history_overrides (
  target_id  uuid not null,
  user_id    uuid not null,
  expires_at timestamptz not null,
  primary key (target_id, user_id)
);

-- Ligt dit moment in een afgelopen seizoen?
create or replace function private.is_past_season(p_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select p_at is not null and private.season_key(p_at) < private.season_key(now());
$$;

create or replace function private.has_history_override(p_target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.history_overrides o
     where o.target_id = p_target and o.user_id = (select auth.uid()) and o.expires_at > now()
  );
$$;

-- De app vraagt toestemming nadat de host de waarschuwing heeft bevestigd.
-- p_kind = 'night' (avond verwijderen) of 'match' (potje heropenen / heropend potje weggooien)
create or replace function public.allow_history_change(p_target uuid, p_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ok boolean;
begin
  if p_kind = 'night' then
    select (n.host_id = (select auth.uid()) or n.created_by = (select auth.uid()) or n.cohost_id = (select auth.uid()))
      into v_ok from public.game_nights n where n.id = p_target;
  elsif p_kind = 'match' then
    v_ok := public.is_match_host(p_target);
  else
    raise exception 'Ongeldige soort';
  end if;
  if not coalesce(v_ok, false) then
    raise exception 'Alleen de host of co-host van deze avond kan dit doen';
  end if;
  insert into private.history_overrides (target_id, user_id, expires_at)
  values (p_target, (select auth.uid()), now() + interval '5 minutes')
  on conflict (target_id, user_id) do update set expires_at = excluded.expires_at;
end;
$$;
grant execute on function public.allow_history_change(uuid, text) to authenticated;

-- Potjes: oorspronkelijk seizoen bewaren + correcties in afgelopen seizoenen bewaken
create or replace function private.guard_match_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_practice boolean;
  v_title    text;
begin
  -- Heropenen: onthoud wanneer het potje oorspronkelijk werd afgerond
  if old.status = 'finished' and new.status = 'live' then
    new.original_finished_at := coalesce(old.original_finished_at, old.finished_at);
    select n.is_practice, n.title into v_practice, v_title from public.game_nights n where n.id = old.night_id;
    if not coalesce(v_practice, false) and private.is_past_season(new.original_finished_at) then
      if not private.has_history_override(old.id) then
        raise exception 'HISTORISCH: dit potje hoort bij een afgesloten seizoen. Bevestig eerst de waarschuwing.';
      end if;
      insert into public.activity (type, actor_id, game_id, payload)
      values ('history_correction', (select auth.uid()), old.game_id,
              jsonb_build_object('action', 'match_reopened', 'season', private.season_key(new.original_finished_at),
                                 'title', v_title, 'night', old.night_id));
    end if;
  end if;
  -- Opnieuw afronden: terug naar het oorspronkelijke moment (en dus het oorspronkelijke seizoen)
  if old.status = 'live' and new.status = 'finished' and old.original_finished_at is not null then
    new.finished_at := old.original_finished_at;
    new.original_finished_at := old.original_finished_at;
  end if;
  return new;
end;
$$;
create or replace trigger matches_guard_history before update of status on public.matches
  for each row execute function private.guard_match_history();

-- Een (heropend) potje uit een afgelopen seizoen weggooien
create or replace function private.guard_match_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_at       timestamptz := coalesce(old.original_finished_at, old.finished_at);
  v_practice boolean;
  v_title    text;
begin
  if not private.is_past_season(v_at) then return old; end if;
  select n.is_practice, n.title into v_practice, v_title from public.game_nights n where n.id = old.night_id;
  if v_practice is null or v_practice then return old; end if; -- avond wordt zelf verwijderd, of oefenavond
  if private.has_history_override(old.night_id) then return old; end if; -- hele avond bewust verwijderd
  if not private.has_history_override(old.id) then
    raise exception 'HISTORISCH: dit potje hoort bij een afgesloten seizoen. Bevestig eerst de waarschuwing.';
  end if;
  insert into public.activity (type, actor_id, game_id, payload)
  values ('history_correction', (select auth.uid()), old.game_id,
          jsonb_build_object('action', 'match_removed', 'season', private.season_key(v_at), 'title', v_title));
  return old;
end;
$$;
create or replace trigger matches_guard_removal before delete on public.matches
  for each row execute function private.guard_match_removal();

-- Een avond met uitslagen uit een afgelopen seizoen verwijderen
create or replace function private.guard_night_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seasons jsonb;
  v_matches int;
begin
  if old.is_practice then return old; end if;
  select coalesce(jsonb_agg(distinct private.season_key(coalesce(m.original_finished_at, m.finished_at))), '[]'::jsonb),
         count(*)
    into v_seasons, v_matches
    from public.matches m
   where m.night_id = old.id
     and private.is_past_season(coalesce(m.original_finished_at, m.finished_at));
  if v_matches = 0 then return old; end if;
  if not private.has_history_override(old.id) then
    raise exception 'HISTORISCH: deze avond hoort bij een afgesloten seizoen. Bevestig eerst de waarschuwing.';
  end if;
  insert into public.activity (type, actor_id, payload)
  values ('history_correction', (select auth.uid()),
          jsonb_build_object('action', 'night_removed', 'seasons', v_seasons, 'title', old.title, 'matches', v_matches));
  return old;
end;
$$;
create or replace trigger game_nights_guard_removal before delete on public.game_nights
  for each row execute function private.guard_night_removal();
