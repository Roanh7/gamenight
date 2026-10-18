-- Wanted-systeem: spelers met 3+ zeges op rij krijgen een premie op hun hoofd.
--  * De XP wordt in de app uitgerekend uit de uitslagen (net als alle andere XP), dus
--    heropenen/corrigeren rekent alles vanzelf opnieuw uit.
--  * Deze functies maken alleen de nieuwsberichten (Sportkrant) en houden die kloppend:
--    na elk afgerond of heropend potje worden de berichten vanaf dat potje bijgewerkt.
--  * De host kan Wanted per avond uitzetten: potjes van die avond tellen dan niet mee
--    voor winstreeksen of premies.
--  * De berichten worden pas gemaakt als app_settings 'wanted_news' = 'on' (aangezet bij
--    livegang), zodat de huidige versie van de app geen onbekende berichten krijgt.

alter table public.game_nights add column if not exists wanted_off boolean not null default false;

-- Niveau en premie bij een winstreek (zelfde regels als src/lib/wanted.ts)
create or replace function private.wanted_xp(p_streak int)
returns int language sql immutable as $$
  select case when p_streak >= 7 then 40 when p_streak >= 5 then 25 when p_streak >= 3 then 15 else 0 end;
$$;

create or replace function private.wanted_level(p_streak int)
returns text language sql immutable as $$
  select case when p_streak >= 7 then 'public_enemy' when p_streak >= 5 then 'most_wanted' when p_streak >= 3 then 'wanted' else null end;
$$;

-- Berekent alle Wanted-gebeurtenissen opnieuw en werkt de berichten bij vanaf p_from
-- (alleen wat veranderd is, zodat reacties en comments op bestaande berichten blijven staan).
create or replace function private.sync_wanted_news(p_from timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m        record;
  r        record;
  v_streak jsonb := '{}'::jsonb;
  v_s      int;
  v_wins   uuid[];
  v_n      int;
  v_xp     int;
  v_ev     jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.app_settings where key = 'wanted_news' and value = 'on') then
    return;
  end if;
  for m in
    select mt.id, mt.created_at, mt.night_id, mt.game_id
      from public.matches mt
      join public.game_nights n on n.id = mt.night_id
     where mt.status = 'finished' and not n.wanted_off
     order by mt.created_at, mt.id
  loop
    select coalesce(array_agg(user_id order by user_id), '{}') into v_wins
      from public.match_results where match_id = m.id and is_winner;
    v_n := coalesce(array_length(v_wins, 1), 0);

    for r in select user_id, is_winner from public.match_results where match_id = m.id order by user_id loop
      v_s := coalesce((v_streak ->> r.user_id::text)::int, 0);
      if r.is_winner then
        v_s := v_s + 1;
        if v_s in (3, 5, 7) then
          v_ev := v_ev || jsonb_build_array(jsonb_build_object('match_id', m.id, 'created_at', m.created_at, 'type', 'wanted', 'actor_id', r.user_id, 'game_id', m.game_id, 'night_id', m.night_id, 'payload',
            jsonb_build_object('streak', v_s, 'level', private.wanted_level(v_s), 'xp', private.wanted_xp(v_s))));
        end if;
      else
        if v_s >= 3 then
          if v_n > 0 then
            v_xp := private.wanted_xp(v_s);
            if v_n > 1 then v_xp := greatest(1, round(v_xp::numeric / v_n)::int); end if;
            v_ev := v_ev || jsonb_build_array(jsonb_build_object('match_id', m.id, 'created_at', m.created_at, 'type', 'bounty_claimed', 'actor_id', v_wins[1], 'game_id', m.game_id, 'night_id', m.night_id, 'payload',
            jsonb_build_object('target', r.user_id, 'streak', v_s, 'level', private.wanted_level(v_s),
                               'xp', v_xp, 'winners', to_jsonb(v_wins))));
          else
            v_ev := v_ev || jsonb_build_array(jsonb_build_object('match_id', m.id, 'created_at', m.created_at, 'type', 'streak_ended', 'actor_id', r.user_id, 'game_id', m.game_id, 'night_id', m.night_id, 'payload',
            jsonb_build_object('target', r.user_id, 'streak', v_s, 'level', private.wanted_level(v_s))));
          end if;
        end if;
        v_s := 0;
      end if;
      v_streak := jsonb_set(v_streak, array[r.user_id::text], to_jsonb(v_s));
    end loop;
  end loop;

  -- Berichten die niet meer kloppen weghalen
  delete from public.activity a
   where a.type in ('wanted', 'bounty_claimed', 'streak_ended')
     and a.match_id in (select id from public.matches where created_at >= p_from)
     and not exists (
       select 1 from jsonb_to_recordset(v_ev) as e(match_id uuid, created_at timestamptz, type text, actor_id uuid, game_id uuid, night_id uuid, payload jsonb)
        where e.match_id = a.match_id and e.type = a.type and e.actor_id is not distinct from a.actor_id
          and e.payload = a.payload);

  -- Nieuwe berichten toevoegen
  insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
  select e.type, e.actor_id, e.game_id, e.night_id, e.match_id, e.payload
    from jsonb_to_recordset(v_ev) as e(match_id uuid, created_at timestamptz, type text, actor_id uuid, game_id uuid, night_id uuid, payload jsonb)
   where e.created_at >= p_from
     and not exists (
       select 1 from public.activity a
        where a.match_id = e.match_id and a.type = e.type and a.actor_id is not distinct from e.actor_id
          and a.payload = e.payload)
   order by e.created_at;
end;
$$;
revoke all on function private.sync_wanted_news(timestamptz) from public, anon, authenticated;

-- Na afronden of heropenen: avondsamenvatting (als de avond al klaar was) en Wanted-berichten bijwerken
create or replace function private.refresh_recap_after_match()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if (select n.status from public.game_nights n where n.id = new.night_id) = 'finished' then
      perform public.finish_night(new.night_id);
    end if;
    perform private.sync_wanted_news(new.created_at);
  end if;
  return new;
end;
$$;

-- Host zet Wanted aan/uit voor zijn avond
create or replace function public.set_wanted_off(p_night uuid, p_off boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_from timestamptz;
begin
  if not public.is_night_host(p_night) then raise exception 'Alleen de host kan dit aanpassen'; end if;
  update public.game_nights set wanted_off = coalesce(p_off, false) where id = p_night;
  select min(created_at) into v_from from public.matches where night_id = p_night;
  if v_from is not null then perform private.sync_wanted_news(v_from); end if;
end;
$$;
revoke all on function public.set_wanted_off(uuid, boolean) from public, anon;
grant execute on function public.set_wanted_off(uuid, boolean) to authenticated;
