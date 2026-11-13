-- 🏆 Smash Bros Championship Cup — de digitale wisselbeker.
--  * game_nights.smash_cup: bij het plannen gekozen. Dan is de Smash op die avond een officieel bekerevenement.
--  * public.smash_cups: elke bekeruitslag (ook historische, van vóór de app). De REGERENDE kampioen is altijd de
--    winnaar van de nieuwste niet-verwijderde uitslag (op datum). Er wordt dus nergens een losse "huidige kampioen"
--    bijgehouden die uit de pas kan lopen.
--  * Een uitslag bevestigen kan alleen de host/co-host, bij een Cup-avond die bezig of afgelopen is én waarop minstens
--    één Smash-potje is afgerond. Eén uitslag per avond: opnieuw bevestigen maakt geen tweede registratie.
--  * Wordt de avond afgelast/teruggezet of de Cup uitgezet, dan telt die uitslag niet meer (removed_at).
--  * Volgorde binnen één dag: confirmed_at gebruikt clock_timestamp(), zodat twee bevestigingen nooit dezelfde tijd krijgen.
--  * Niets hiervan verandert competitiepunten, XP, achievements of andere uitslagen.

alter table public.game_nights add column if not exists smash_cup boolean not null default false;

create table if not exists public.smash_cups (
  id           uuid primary key default gen_random_uuid(),
  night_id     uuid unique references public.game_nights (id) on delete cascade,
  held_on      date not null,
  winner_id    uuid not null references public.profiles (id),
  is_historic  boolean not null default false,
  note         text check (note is null or char_length(note) <= 200),
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default clock_timestamp(),
  removed_at   timestamptz
);
create index if not exists smash_cups_order on public.smash_cups (held_on desc, confirmed_at desc);
alter table public.smash_cups enable row level security;
create policy "leden lezen" on public.smash_cups for select to authenticated using (removed_at is null);
grant select on public.smash_cups to authenticated;

-- Regerende kampioen (null als er nog geen is)
create or replace function public.smash_champion()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.winner_id from public.smash_cups c
   where c.removed_at is null
   order by c.held_on desc, c.confirmed_at desc
   limit 1;
$$;
grant execute on function public.smash_champion() to authenticated;

-- Host/co-host bevestigt de winnaar van de Cup van deze avond
create or replace function public.confirm_smash_cup(p_night uuid, p_winner uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_night   public.game_nights%rowtype;
  v_held    date;
  v_old     public.smash_cups%rowtype;
  v_prev    uuid;
  v_defend  boolean;
  v_cups    int;
  v_smash   uuid;
begin
  select * into v_night from public.game_nights n where n.id = p_night;
  if v_night.id is null then raise exception 'Avond niet gevonden'; end if;
  if not public.is_night_host(p_night) then
    raise exception 'Alleen de host of co-host kan de bekerwinnaar bevestigen';
  end if;
  if not v_night.smash_cup or coalesce(v_night.is_practice, false) then
    raise exception 'Deze avond is geen Smash Bros Championship Cup';
  end if;
  if v_night.status not in ('live', 'finished') then
    raise exception 'De Cup kan pas worden bevestigd als de avond bezig of afgelopen is';
  end if;
  select g.id into v_smash from public.games g where g.name ilike '%smash%' order by g.created_at limit 1;
  if not exists (
    select 1 from public.matches m
     where m.night_id = p_night and m.status = 'finished' and (v_smash is null or m.game_id = v_smash)
  ) then
    raise exception 'Er is nog geen Smash-potje afgerond op deze avond';
  end if;
  if not (
    p_winner = v_night.host_id or p_winner is not distinct from v_night.cohost_id
    or exists (select 1 from public.participants p where p.night_id = p_night and p.user_id = p_winner and p.status = 'confirmed')
    or exists (select 1 from public.match_results r join public.matches m on m.id = r.match_id where m.night_id = p_night and r.user_id = p_winner)
  ) then
    raise exception 'De winnaar moet op deze avond hebben meegedaan';
  end if;

  v_held := (v_night.starts_at at time zone 'Europe/Amsterdam')::date;
  select * into v_old from public.smash_cups c where c.night_id = p_night;
  if v_old.id is not null and v_old.removed_at is null and v_old.winner_id = p_winner then
    return jsonb_build_object('changed', false, 'winner', p_winner);
  end if;

  -- Vorige kampioen: nieuwste uitslag vóór deze avond
  select c.winner_id into v_prev from public.smash_cups c
   where c.removed_at is null and (c.night_id is distinct from p_night)
     and (c.held_on < v_held or (c.held_on = v_held and c.confirmed_at < coalesce(v_old.confirmed_at, clock_timestamp())))
   order by c.held_on desc, c.confirmed_at desc limit 1;
  v_defend := v_prev is not null and v_prev = p_winner;

  insert into public.smash_cups (night_id, held_on, winner_id, is_historic, confirmed_by, confirmed_at, removed_at)
  values (p_night, v_held, p_winner, false, (select auth.uid()), coalesce(v_old.confirmed_at, clock_timestamp()), null)
  on conflict (night_id) do update
    set winner_id = excluded.winner_id, held_on = excluded.held_on, confirmed_by = excluded.confirmed_by, removed_at = null;

  select count(*) into v_cups from public.smash_cups c where c.removed_at is null and c.winner_id = p_winner;

  insert into public.activity (type, actor_id, game_id, night_id, payload)
  values ('smash_champion', p_winner, v_smash, p_night,
          jsonb_build_object('defended', v_defend, 'previous', v_prev, 'cups', v_cups,
                             'corrected', v_old.id is not null and v_old.removed_at is null));
  return jsonb_build_object('changed', true, 'winner', p_winner, 'defended', v_defend, 'previous', v_prev, 'cups', v_cups);
end;
$$;
grant execute on function public.confirm_smash_cup(uuid, uuid) to authenticated;

-- Afgelast / teruggezet / Cup uitgezet → de uitslag van die avond telt niet meer
create or replace function private.smash_cup_night_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('planned', 'cancelled') or not new.smash_cup or coalesce(new.is_practice, false) then
    update public.smash_cups set removed_at = now() where night_id = new.id and removed_at is null;
  end if;
  return null;
end;
$$;
create or replace trigger game_nights_smash_cup after update of status, smash_cup on public.game_nights
  for each row execute function private.smash_cup_night_changed();

-- Beheerder: historische bekerwinnaar toevoegen (van vóór de app) of weghalen
create or replace function public.add_historic_smash_cup(p_held_on date, p_winner uuid, p_note text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_app_admin() then raise exception 'Alleen voor de beheerder'; end if;
  if p_held_on is null or p_held_on > current_date then raise exception 'Kies een datum in het verleden'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_winner) then raise exception 'Speler niet gevonden'; end if;
  insert into public.smash_cups (held_on, winner_id, is_historic, note, confirmed_by)
  values (p_held_on, p_winner, true, nullif(left(trim(coalesce(p_note, '')), 200), ''), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.add_historic_smash_cup(date, uuid, text) to authenticated;

create or replace function public.remove_historic_smash_cup(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'Alleen voor de beheerder'; end if;
  update public.smash_cups set removed_at = now() where id = p_id and is_historic and removed_at is null;
end;
$$;
grant execute on function public.remove_historic_smash_cup(uuid) to authenticated;

-- Rahim is de huidige bekerhouder: hij won de Cup op 30 december 2025 (vóór de app bestond)
insert into public.smash_cups (held_on, winner_id, is_historic, note)
select date '2025-12-30', p.id, true, 'Ingevoerd bij de start van de digitale beker'
  from public.profiles p
 where p.id = 'a4b8ef16-179f-4601-b404-ca51a6ac5ca7'
   and not exists (select 1 from public.smash_cups c where c.is_historic and c.held_on = date '2025-12-30' and c.winner_id = p.id);
