-- Teamspellen: bij een gelijke stand bovenaan winnen alle spelers op de eerste plek.
alter table public.games add column if not exists is_team boolean not null default false;

create or replace function public.finalize_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match     public.matches;
  v_game      public.games;
  v_players   int;
  v_top_count int;
  v_winner    uuid;
  v_team_win  boolean;
  v_before    jsonb;
  v_winners   jsonb;
  r           record;
  v_old       int;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Potje niet gevonden'; end if;
  if not public.is_night_host(v_match.night_id) then
    raise exception 'Alleen de host van deze avond kan dit potje afronden';
  end if;
  if v_match.status = 'finished' then raise exception 'Dit potje is al afgerond'; end if;

  select count(*) into v_players from public.match_players where match_id = p_match_id;
  if v_players < 2 then raise exception 'Er zijn minimaal 2 spelers nodig'; end if;

  select * into v_game from public.games where id = v_match.game_id;

  select coalesce(jsonb_object_agg(user_id::text, rank), '{}'::jsonb)
    into v_before
    from public.game_leaderboard where game_id = v_game.id;

  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner)
  select p_match_id, t.user_id, v_game.id, t.total, t.placement,
         coalesce(v_game.placement_points[t.placement], 0) + v_game.participation_points,
         false
  from (
    select mp.user_id,
           coalesce(sum(se.points), 0) as total,
           (rank() over (order by
              case when v_game.scoring_mode = 'lowest_wins'
                   then coalesce(sum(se.points), 0)
                   else -coalesce(sum(se.points), 0) end))::int as placement
    from public.match_players mp
    left join public.score_entries se
      on se.match_id = mp.match_id and se.user_id = mp.user_id
    where mp.match_id = p_match_id
    group by mp.user_id
  ) t;

  select count(*) into v_top_count from public.match_results where match_id = p_match_id and placement = 1;
  v_team_win := v_game.is_team and v_top_count > 1 and v_top_count < v_players;

  if v_top_count = 1 then
    select user_id into v_winner from public.match_results where match_id = p_match_id and placement = 1;
    update public.match_results set is_winner = true where match_id = p_match_id and user_id = v_winner;
  elsif v_team_win then
    update public.match_results set is_winner = true where match_id = p_match_id and placement = 1;
  end if;

  select coalesce(jsonb_agg(user_id), '[]'::jsonb) into v_winners
    from public.match_results where match_id = p_match_id and is_winner;

  update public.matches
     set status = 'finished', finished_at = now(),
         winner_id = v_winner, is_draw = (v_top_count > 1 and not v_team_win)
   where id = p_match_id;

  insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
  values ('match_finished', v_winner, v_game.id, v_match.night_id, p_match_id,
          jsonb_build_object('draw', v_top_count > 1 and not v_team_win, 'team', v_team_win,
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

-- (create or replace behoudt de bestaande rechten op de functie)
