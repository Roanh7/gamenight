-- Veilig opslaan van conceptscores tijdens een potje
--  * elke scorecel krijgt een versienummer (wie het laatst wijzigde en wanneer)
--  * een lege cel blijft bestaan met points = null (zodat de versie doorloopt)
--  * wijzigingen gaan via save_score / save_team_score:
--      'add' = punten erbij/eraf (twee mensen tegelijk tellen gewoon op, geen conflict)
--      'set' = vaste waarde invullen; alleen als niemand anders de cel intussen wijzigde,
--              anders komt het antwoord 'conflict' terug met de actuele waarde
--  * elke wijziging heeft een eigen id: een tweede keer versturen (na een haperende
--    verbinding) wordt herkend en nooit dubbel geteld
--  * na het heropenen of opnieuw afronden van een potje van een afgesloten avond
--    wordt de avondsamenvatting opnieuw berekend

alter table public.score_entries alter column points drop not null;
alter table public.score_entries add column if not exists version int not null default 1;
alter table public.score_entries add column if not exists updated_at timestamptz not null default now();
alter table public.score_entries add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.team_scores alter column points drop not null;
alter table public.team_scores add column if not exists version int not null default 1;
alter table public.team_scores add column if not exists updated_at timestamptz not null default now();
alter table public.team_scores add column if not exists updated_by uuid references public.profiles (id) on delete set null;

-- Al verwerkte wijzigingen (tegen dubbel tellen)
create table if not exists public.score_ops (
  op_id      uuid primary key,
  match_id   uuid not null references public.matches (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.score_ops enable row level security;
revoke all on public.score_ops from anon, authenticated;

-- Gedeelde logica voor één cel. p_kind = 'player' of 'team'.
create or replace function private.apply_score(
  p_kind text, p_match uuid, p_who text, p_round int, p_op text, p_value numeric, p_base int, p_op_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_points  numeric;
  v_version int;
  v_by      uuid;
  v_new     numeric;
begin
  if not public.is_match_host(p_match) then
    raise exception 'Alleen de host of co-host kan scores invoeren';
  end if;
  if p_round is null or p_round < 1 or p_round > 200 then raise exception 'Ongeldige ronde'; end if;
  if p_op not in ('set', 'add') then raise exception 'Ongeldige wijziging'; end if;
  if p_op = 'add' and p_value is null then raise exception 'Ongeldige wijziging'; end if;
  if p_value is not null and abs(p_value) > 1000000 then raise exception 'Score te groot'; end if;

  -- Potje al afgerond: concepten tellen niet meer mee
  if not public.match_is_live(p_match) then
    return jsonb_build_object('status', 'closed');
  end if;

  if p_kind = 'player' then
    if not exists (select 1 from public.match_players where match_id = p_match and user_id = p_who::uuid) then
      raise exception 'Deze speler doet niet mee aan dit potje';
    end if;
  elsif p_kind = 'team' then
    if p_who is null or char_length(p_who) not between 1 and 30 then raise exception 'Ongeldige teamnaam'; end if;
  else
    raise exception 'Ongeldig soort score';
  end if;

  -- Deze wijziging al eerder verwerkt? Dan alleen de huidige stand teruggeven.
  if p_op_id is not null then
    insert into public.score_ops (op_id, match_id) values (p_op_id, p_match) on conflict (op_id) do nothing;
    if not found then
      if p_kind = 'player' then
        select points, version into v_points, v_version from public.score_entries
         where match_id = p_match and user_id = p_who::uuid and round = p_round;
      else
        select points, version into v_points, v_version from public.team_scores
         where match_id = p_match and team = p_who and round = p_round;
      end if;
      return jsonb_build_object('status', 'ok', 'points', v_points, 'version', coalesce(v_version, 0), 'duplicate', true);
    end if;
  end if;

  -- Zorg dat de cel bestaat (versie 0 = nog nooit ingevuld) en zet er een slot op
  if p_kind = 'player' then
    insert into public.score_entries (match_id, user_id, round, points, version, updated_by)
    values (p_match, p_who::uuid, p_round, null, 0, auth.uid())
    on conflict (match_id, user_id, round) do nothing;
    select points, version, updated_by into v_points, v_version, v_by from public.score_entries
     where match_id = p_match and user_id = p_who::uuid and round = p_round for update;
  else
    insert into public.team_scores (match_id, team, round, points, version, updated_by)
    values (p_match, p_who, p_round, null, 0, auth.uid())
    on conflict (match_id, team, round) do nothing;
    select points, version, updated_by into v_points, v_version, v_by from public.team_scores
     where match_id = p_match and team = p_who and round = p_round for update;
  end if;

  if p_op = 'add' then
    v_new := coalesce(v_points, 0) + p_value;
  else
    -- 'set': alleen als de cel sinds jouw laatste versie niet door iemand anders is gewijzigd
    if p_base is distinct from v_version and v_points is distinct from p_value then
      -- niet als verwerkt markeren: een herhaling moet opnieuw beoordeeld worden
      delete from public.score_ops where op_id = p_op_id;
      return jsonb_build_object('status', 'conflict', 'points', v_points, 'version', v_version, 'by', v_by);
    end if;
    v_new := p_value;
  end if;

  if p_kind = 'player' then
    update public.score_entries
       set points = v_new, version = v_version + 1, updated_at = now(), updated_by = auth.uid()
     where match_id = p_match and user_id = p_who::uuid and round = p_round;
  else
    update public.team_scores
       set points = v_new, version = v_version + 1, updated_at = now(), updated_by = auth.uid()
     where match_id = p_match and team = p_who and round = p_round;
  end if;
  return jsonb_build_object('status', 'ok', 'points', v_new, 'version', v_version + 1);
end;
$$;

create or replace function public.save_score(
  p_match uuid, p_user uuid, p_round int, p_op text, p_value numeric, p_base int, p_op_id uuid
) returns jsonb language sql security definer set search_path = '' as $$
  select private.apply_score('player', p_match, p_user::text, p_round, p_op, p_value, p_base, p_op_id);
$$;

create or replace function public.save_team_score(
  p_match uuid, p_team text, p_round int, p_op text, p_value numeric, p_base int, p_op_id uuid
) returns jsonb language sql security definer set search_path = '' as $$
  select private.apply_score('team', p_match, p_team, p_round, p_op, p_value, p_base, p_op_id);
$$;

revoke all on function private.apply_score(text, uuid, text, int, text, numeric, int, uuid) from public, anon, authenticated;
revoke all on function public.save_score(uuid, uuid, int, text, numeric, int, uuid) from public, anon;
revoke all on function public.save_team_score(uuid, text, int, text, numeric, int, uuid) from public, anon;
grant execute on function public.save_score(uuid, uuid, int, text, numeric, int, uuid) to authenticated;
grant execute on function public.save_team_score(uuid, text, int, text, numeric, int, uuid) to authenticated;

-- Avondsamenvatting bijwerken als een potje van een afgesloten avond wordt heropend of opnieuw afgerond
create or replace function private.refresh_recap_after_match()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and (select n.status from public.game_nights n where n.id = new.night_id) = 'finished' then
    perform public.finish_night(new.night_id);
  end if;
  return new;
end;
$$;
revoke all on function private.refresh_recap_after_match() from public, anon, authenticated;

create or replace trigger matches_refresh_recap after update of status on public.matches
  for each row execute function private.refresh_recap_after_match();
