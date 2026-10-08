-- Teamspellen met rollen die pas na afloop bekend zijn (Weerwolven, Secret Hitler, Undercover).
-- Per game: teams met punten bij winst. Na afloop wijst de host per speler een team toe
-- en kiest het winnende team.

alter table public.games add column if not exists teams jsonb not null default '[]'::jsonb;  -- [{"name": "Dorp", "points": 8}, ...]
alter table public.match_players add column if not exists team text;
alter table public.matches add column if not exists winning_team text;

create or replace function public.finalize_team_match(p_match_id uuid, p_winning_team text, p_teams jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match    public.matches;
  v_game     public.games;
  v_players  int;
  v_missing  int;
  v_points   int;
  v_winners  jsonb;
  v_count    int;
  v_winner   uuid;
  v_before   jsonb;
  r          record;
  v_old      int;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Potje niet gevonden'; end if;
  if not public.is_night_host(v_match.night_id) then
    raise exception 'Alleen de host van deze avond kan dit potje afronden';
  end if;
  if v_match.status = 'finished' then raise exception 'Dit potje is al afgerond'; end if;

  select * into v_game from public.games where id = v_match.game_id;

  select count(*) into v_players from public.match_players where match_id = p_match_id;
  if v_players < 2 then raise exception 'Er zijn minimaal 2 spelers nodig'; end if;

  -- Rollen opslaan
  update public.match_players mp
     set team = nullif(trim(p_teams ->> mp.user_id::text), '')
   where mp.match_id = p_match_id;

  select count(*) into v_missing from public.match_players where match_id = p_match_id and team is null;
  if v_missing > 0 then raise exception 'Kies voor elke speler een team'; end if;

  select count(*) into v_count from public.match_players where match_id = p_match_id and team = p_winning_team;
  if v_count = 0 then raise exception 'Niemand zat in het winnende team'; end if;

  select coalesce(max((t ->> 'points')::int), 10) into v_points
    from jsonb_array_elements(v_game.teams) t
   where t ->> 'name' = p_winning_team;

  select coalesce(jsonb_object_agg(user_id::text, rank), '{}'::jsonb)
    into v_before
    from public.game_leaderboard where game_id = v_game.id;

  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner)
  select p_match_id, mp.user_id, v_game.id,
         case when mp.team = p_winning_team then 1 else 0 end,
         case when mp.team = p_winning_team then 1 else 2 end,
         case when mp.team = p_winning_team then v_points else 0 end + v_game.participation_points,
         mp.team = p_winning_team
    from public.match_players mp
   where mp.match_id = p_match_id;

  if v_count = 1 then
    select user_id into v_winner from public.match_players where match_id = p_match_id and team = p_winning_team;
  end if;
  select coalesce(jsonb_agg(user_id), '[]'::jsonb) into v_winners
    from public.match_players where match_id = p_match_id and team = p_winning_team;

  update public.matches
     set status = 'finished', finished_at = now(), winner_id = v_winner,
         is_draw = false, winning_team = p_winning_team
   where id = p_match_id;

  insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
  values ('match_finished', v_winner, v_game.id, v_match.night_id, p_match_id,
          jsonb_build_object('draw', false, 'team', true, 'team_name', p_winning_team,
                             'winners', v_winners, 'players', v_players));

  for r in select user_id, rank from public.game_leaderboard where game_id = v_game.id loop
    v_old := (v_before ->> r.user_id::text)::int;
    if (v_old is null and r.rank = 1) or (v_old is not null and r.rank < v_old) then
      insert into public.activity (type, actor_id, game_id, match_id, payload)
      values ('rank_up', r.user_id, v_game.id, p_match_id,
              jsonb_build_object('old_rank', v_old, 'new_rank', r.rank));
    end if;
  end loop;
end;
$$;

revoke all on function public.finalize_team_match(uuid, text, jsonb) from public, anon;
grant execute on function public.finalize_team_match(uuid, text, jsonb) to authenticated;
