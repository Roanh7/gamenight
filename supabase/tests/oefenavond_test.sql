-- Test oefenavond: potjes tellen nergens voor mee, geen nieuws, vlag ligt vast.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
do $test$
declare
  rep text := E'\n';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  g1 uuid; nreal uuid; npr uuid; m1 uuid; m2 uuid; cnt int; t text; code text; act0 int;
begin
  select value into code from public.app_settings where key = 'invite_code';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_oa@test.invalid', jsonb_build_object('username','ZzOefA','invite_code',code), now(), now()),
   (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_ob@test.invalid', jsonb_build_object('username','ZzOefB','invite_code',code), now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.games (name, created_by) values ('ZzOef', ua) returning id into g1;
  select count(*) into act0 from public.activity;

  -- Oefenavond aanmaken: geen nieuwsbericht
  insert into public.game_nights (title, starts_at, host_id, created_by, is_practice) values ('ZzOefenavond', now(), ua, ua, true) returning id into npr;
  select count(*) - act0 into cnt from public.activity;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 1 oefenavond plannen geeft geen nieuws\n';
  insert into public.participants (night_id, user_id, status) values (npr, ub, 'confirmed');
  update public.game_nights set status = 'live' where id = npr;

  -- Potje op de oefenavond, B wint
  insert into public.matches (night_id, game_id) values (npr, g1) returning id into m1;
  insert into public.match_players (match_id, user_id) values (m1, ua), (m1, ub);
  perform public.save_score(m1, ua, 1, 'set', 3, 0, gen_random_uuid());
  perform public.save_score(m1, ub, 1, 'set', 9, 0, gen_random_uuid());
  perform public.finalize_match(m1);
  select count(*) into cnt from public.match_results where match_id = m1 and is_winner and user_id = ub;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 2 potje afronden op oefenavond werkt (winnaar bepaald)\n';
  select count(*) into cnt from public.overall_leaderboard where user_id in (ua, ub);
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 3 telt niet in algemene ranglijst\n';
  select count(*) into cnt from public.game_leaderboard where game_id = g1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 3b telt niet in game-ranglijst\n';
  select count(*) - act0 into cnt from public.activity;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 4 geen nieuws over de uitslag\n';

  -- Heropenen en opnieuw afronden kan gewoon
  perform public.reopen_match(m1);
  perform public.finalize_match(m1);
  select count(*) into cnt from public.match_results where match_id = m1;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || E' 5 heropenen werkt ook op oefenavond\n';

  -- Afsluiten: geen recap in het nieuws
  perform public.finish_night(npr);
  select count(*) - act0 into cnt from public.activity;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 6 afsluiten geeft geen recap in het nieuws\n';

  -- Vlag kan niet veranderen
  update public.game_nights set is_practice = false where id = npr;
  select is_practice::text into t from public.game_nights where id = npr;
  rep := rep || case when t = 'true' then 'OK' else 'FAIL' end || E' 7 oefenavond kan geen echte avond worden\n';

  -- Echte avond telt wel
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzEcht', now(), ua, ua) returning id into nreal;
  update public.game_nights set is_practice = true where id = nreal;
  select is_practice::text into t from public.game_nights where id = nreal;
  rep := rep || case when t = 'false' then 'OK' else 'FAIL' end || E' 7b echte avond kan geen oefenavond worden\n';
  insert into public.participants (night_id, user_id, status) values (nreal, ub, 'confirmed');
  update public.game_nights set status = 'live' where id = nreal;
  insert into public.matches (night_id, game_id) values (nreal, g1) returning id into m2;
  insert into public.match_players (match_id, user_id) values (m2, ua), (m2, ub);
  insert into public.score_entries (match_id, user_id, round, points) values (m2, ua, 1, 5), (m2, ub, 1, 1);
  perform public.finalize_match(m2);
  select string_agg(p.username || ':' || l.played || '/' || l.wins, ', ' order by p.username) into t
    from public.overall_leaderboard l join public.profiles p on p.id = l.user_id where l.user_id in (ua, ub);
  rep := rep || case when t = 'ZzOefA:1/1, ZzOefB:1/0' then 'OK' else 'FAIL' end || ' 8 alleen het echte potje telt: ' || coalesce(t, '-') || E'\n';
  select count(*) into cnt from public.activity where match_id = m2 and type = 'match_finished';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 8b echte uitslag wel in het nieuws\n';

  -- Oefenavond weggooien (host)
  delete from public.game_nights where id = npr;
  select count(*) into cnt from public.matches where id = m1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 9 host kan oefenavond met potjes weggooien\n';
  reset role;

  raise exception 'TESTRAPPORT (alles teruggedraaid):%', rep;
end
$test$;
