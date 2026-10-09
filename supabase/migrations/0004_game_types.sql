-- Drie soorten spellen:
--   solo  = ieder voor zich (punten per speler)
--   teams = vaste teams, score per team (bijv. 30 seconds, Pictionary)
--   roles = geheime rollen, team pas na afloop bekend (Weerwolven, Secret Hitler)
alter table public.games add column if not exists game_type text not null default 'solo'
  check (game_type in ('solo', 'teams', 'roles'));
update public.games set game_type = 'roles' where is_team and game_type = 'solo';

-- Scores per team per ronde
create table if not exists public.team_scores (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team     text not null check (char_length(team) between 1 and 30),
  round    int not null check (round between 1 and 200),
  points   numeric not null default 0,
  unique (match_id, team, round)
);
alter table public.team_scores enable row level security;
grant select, insert, update, delete on public.team_scores to authenticated;

create policy "leden lezen" on public.team_scores for select to authenticated using (true);
create policy "host voert teamscores in" on public.team_scores for insert to authenticated
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));
create policy "host past teamscores aan" on public.team_scores for update to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id))
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));
create policy "host wist teamscores" on public.team_scores for delete to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id));

-- Host verdeelt spelers over teams zolang het potje loopt
create policy "host verdeelt teams" on public.match_players for update to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id))
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));

create or replace function public.finalize_teams_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match    public.matches;
  v_game     public.games;
  v_players  int;
  v_teams    int;
  v_top      int;
  v_win_team text;
  v_winner   uuid;
  v_winners  jsonb;
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
  if exists (select 1 from public.match_players where match_id = p_match_id and team is null) then
    raise exception 'Verdeel eerst alle spelers over de teams';
  end if;
  select count(distinct team) into v_teams from public.match_players where match_id = p_match_id;
  if v_teams < 2 then raise exception 'Er zijn minimaal 2 teams nodig'; end if;

  select coalesce(jsonb_object_agg(user_id::text, rank), '{}'::jsonb)
    into v_before
    from public.game_leaderboard where game_id = v_game.id;

  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner)
  select p_match_id, mp.user_id, v_game.id, tr.total, tr.placement,
         coalesce(v_game.placement_points[tr.placement], 0) + v_game.participation_points,
         false
    from public.match_players mp
    join (
      select t.team, t.total,
             (rank() over (order by case when v_game.scoring_mode = 'lowest_wins' then t.total else -t.total end))::int as placement
        from (
          select mt.team, coalesce(sum(ts.points), 0) as total
            from (select distinct team from public.match_players where match_id = p_match_id) mt
            left join public.team_scores ts on ts.match_id = p_match_id and ts.team = mt.team
           group by mt.team
        ) t
    ) tr on tr.team = mp.team
   where mp.match_id = p_match_id;

  select count(distinct mp.team) into v_top
    from public.match_results mr
    join public.match_players mp on mp.match_id = mr.match_id and mp.user_id = mr.user_id
   where mr.match_id = p_match_id and mr.placement = 1;
  if v_top = 1 then
    select mp.team into v_win_team
      from public.match_results mr
      join public.match_players mp on mp.match_id = mr.match_id and mp.user_id = mr.user_id
     where mr.match_id = p_match_id and mr.placement = 1
     limit 1;
    update public.match_results mr set is_winner = true
      from public.match_players mp
     where mp.match_id = mr.match_id and mp.user_id = mr.user_id
       and mr.match_id = p_match_id and mp.team = v_win_team;
  end if;

  select coalesce(jsonb_agg(user_id), '[]'::jsonb) into v_winners
    from public.match_results where match_id = p_match_id and is_winner;
  if jsonb_array_length(v_winners) = 1 then
    v_winner := (v_winners ->> 0)::uuid;
  end if;

  update public.matches
     set status = 'finished', finished_at = now(), winner_id = v_winner,
         is_draw = (v_top > 1), winning_team = v_win_team
   where id = p_match_id;

  insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
  values ('match_finished', v_winner, v_game.id, v_match.night_id, p_match_id,
          jsonb_build_object('draw', v_top > 1, 'team', v_win_team is not null, 'team_name', v_win_team,
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

revoke all on function public.finalize_teams_match(uuid) from public, anon;
grant execute on function public.finalize_teams_match(uuid) to authenticated;
