-- Test van het Wanted-systeem (nieuwsberichten in de database).
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
create or replace function pg_temp.play(p_night uuid, p_game uuid, p_at timestamptz, p_scores jsonb)
returns uuid language plpgsql as $$
declare v_m uuid; k text;
begin
  insert into public.matches (night_id, game_id, created_at) values (p_night, p_game, p_at) returning id into v_m;
  for k in select jsonb_object_keys(p_scores) loop
    insert into public.match_players (match_id, user_id) values (v_m, k::uuid);
    insert into public.score_entries (match_id, user_id, round, points) values (v_m, k::uuid, 1, (p_scores ->> k)::numeric);
  end loop;
  perform public.finalize_match(v_m);
  return v_m;
end $$;

do $test$
declare
  rep text := E'\n';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  g1 uuid; gt uuid; n1 uuid; n2 uuid; m6 uuid; m13 uuid; mt uuid; t text; cnt int; code text;
  t0 timestamptz := now() - interval '1 day';
begin
  select value into code from public.app_settings where key = 'invite_code';
  insert into public.app_settings (key, value) values ('wanted_news', 'on')
    on conflict (key) do update set value = excluded.value;
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_wa@test.invalid', jsonb_build_object('username','ZzA','invite_code',code), now(), now()),
   (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_wb@test.invalid', jsonb_build_object('username','ZzB','invite_code',code), now(), now()),
   (uc, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_wc@test.invalid', jsonb_build_object('username','ZzC','invite_code',code), now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.games (name, created_by) values ('ZzW', ua) returning id into g1;
  insert into public.games (name, created_by, game_type) values ('ZzWTeam', ua, 'teams') returning id into gt;
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzW1', t0, ua, ua) returning id into n1;
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzW2', t0, ua, ua) returning id into n2;
  insert into public.participants (night_id, user_id, status) values (n1, ub, 'confirmed'), (n1, uc, 'confirmed'), (n2, ub, 'confirmed'), (n2, uc, 'confirmed');
  update public.game_nights set status = 'live' where id in (n1, n2);

  -- A wint 3 keer → Wanted
  perform pg_temp.play(n1, g1, t0 + interval '1 min', jsonb_build_object(ua, 10, ub, 5, uc, 1));
  perform pg_temp.play(n1, g1, t0 + interval '2 min', jsonb_build_object(ua, 10, ub, 5, uc, 1));
  perform pg_temp.play(n1, g1, t0 + interval '3 min', jsonb_build_object(ua, 10, ub, 5, uc, 1));
  select count(*), max(payload ->> 'streak') into cnt, t from public.activity where type = 'wanted' and actor_id = ua;
  rep := rep || case when cnt = 1 and t = '3' then 'OK' else 'FAIL' end || E' 1 drie zeges op rij = Wanted-bericht\n';
  -- 4e zege, dan een potje zonder A (telt niet), dan verslaat B hem
  perform pg_temp.play(n1, g1, t0 + interval '4 min', jsonb_build_object(ua, 10, ub, 5, uc, 1));
  perform pg_temp.play(n1, g1, t0 + interval '5 min', jsonb_build_object(ub, 1, uc, 9));
  m6 := pg_temp.play(n1, g1, t0 + interval '6 min', jsonb_build_object(ua, 3, ub, 9, uc, 1));
  select actor_id::text || '|' || (payload ->> 'target') || '|' || (payload ->> 'streak') || '|' || (payload ->> 'xp')
    into t from public.activity where type = 'bounty_claimed' and match_id = m6;
  rep := rep || case when t = ub::text || '|' || ua::text || '|4|15' then 'OK' else 'FAIL' end || ' 2 B claimt de premie op A (reeks 4, +15): ' || coalesce(t, '-') || E'\n';
  rep := rep || case when (select count(*) from public.activity where type = 'wanted' and actor_id = ua) = 1 then 'OK' else 'FAIL' end || E' 2b potje zonder A raakte zijn reeks niet\n';

  -- B wint 2 keer (reeks 3 → Wanted), daarna gelijkspel: reeks voorbij zonder premie
  perform pg_temp.play(n1, g1, t0 + interval '7 min', jsonb_build_object(ua, 1, ub, 9, uc, 2));
  perform pg_temp.play(n1, g1, t0 + interval '8 min', jsonb_build_object(ua, 1, ub, 9, uc, 2));
  select count(*) into cnt from public.activity where type = 'wanted' and actor_id = ub;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 3 B is nu Wanted\n';
  perform pg_temp.play(n1, g1, t0 + interval '9 min', jsonb_build_object(ua, 5, ub, 5, uc, 5));
  select count(*) into cnt from public.activity where type = 'streak_ended' and actor_id = ub;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 3b gelijkspel: reeks van B voorbij, geen premie\n';
  select count(*) into cnt from public.activity where type = 'bounty_claimed';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 3c geen premie bij gelijkspel\n';

  -- Avond 2: C wint 3 keer, dan verslaan A en B hem samen in een teamspel → premie verdeeld
  perform pg_temp.play(n2, g1, t0 + interval '10 min', jsonb_build_object(ua, 1, ub, 2, uc, 9));
  perform pg_temp.play(n2, g1, t0 + interval '11 min', jsonb_build_object(ua, 1, ub, 2, uc, 9));
  perform pg_temp.play(n2, g1, t0 + interval '12 min', jsonb_build_object(ua, 1, ub, 2, uc, 9));
  insert into public.matches (night_id, game_id, created_at) values (n2, gt, t0 + interval '13 min') returning id into m13;
  insert into public.match_players (match_id, user_id, team) values (m13, ua, 'Rood'), (m13, ub, 'Rood'), (m13, uc, 'Blauw');
  insert into public.team_scores (match_id, team, round, points) values (m13, 'Rood', 1, 10), (m13, 'Blauw', 1, 3);
  perform public.finalize_teams_match(m13);
  select (payload ->> 'xp') || '|' || jsonb_array_length(payload -> 'winners') into t from public.activity where type = 'bounty_claimed' and match_id = m13;
  rep := rep || case when t = '8|2' then 'OK' else 'FAIL' end || ' 4 teamwinst: premie 15 verdeeld over 2 = 8 elk (' || coalesce(t, '-') || E')\n';

  -- Host zet Wanted uit voor avond 2 → berichten van die avond verdwijnen; weer aan → terug
  perform public.set_wanted_off(n2, true);
  select count(*) into cnt from public.activity where night_id = n2 and type in ('wanted', 'bounty_claimed', 'streak_ended');
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 5 Wanted uit: geen premies op die avond\n';
  perform public.set_wanted_off(n2, false);
  select count(*) into cnt from public.activity where night_id = n2 and type in ('wanted', 'bounty_claimed');
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || E' 5b weer aan: berichten terug\n';

  -- Correctie: potje 6 had A eigenlijk gewonnen
  perform public.reopen_match(m6);
  update public.score_entries set points = 20 where match_id = m6 and user_id = ua;
  perform public.finalize_match(m6);
  select count(*) into cnt from public.activity where type = 'bounty_claimed' and match_id = m6;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 6 na correctie: geen premie meer in potje 6\n';
  select max(payload ->> 'level') into t from public.activity where type = 'wanted' and actor_id = ua and match_id = m6;
  rep := rep || case when t = 'most_wanted' then 'OK' else 'FAIL' end || ' 6b A is nu Most Wanted (5 op rij): ' || coalesce(t, '-') || E'\n';
  select actor_id::text || '|' || (payload ->> 'streak') || '|' || (payload ->> 'xp') into t
    from public.activity a join public.matches mm on mm.id = a.match_id
   where a.type = 'bounty_claimed' and (a.payload ->> 'target')::uuid = ua and mm.created_at = t0 + interval '7 min';
  rep := rep || case when t = ub::text || '|5|25' then 'OK' else 'FAIL' end || ' 6c premie verschoof naar potje 7 (+25): ' || coalesce(t, '-') || E'\n';
  select count(*) into cnt from public.activity where type = 'wanted' and actor_id = ub;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 6d B haalt nu geen 3 op rij meer: Wanted-bericht weg\n';
  select count(*) into cnt from (select match_id, type, actor_id, payload from public.activity where type in ('wanted','bounty_claimed','streak_ended') group by 1,2,3,4 having count(*) > 1) d;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 7 geen dubbele berichten\n';
  reset role;

  raise exception 'TESTRAPPORT (alles teruggedraaid):%', rep;
end
$test$;
