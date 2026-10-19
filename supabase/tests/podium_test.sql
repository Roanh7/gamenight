-- Podium Ceremony: wanneer komt er een ceremonie, en nooit dubbel.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid. Het rapport staat in de foutmelding.
do $test$
declare
  rep text := E'\n';
  code text;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  g1 uuid; n1 uuid; n2 uuid; m1 uuid; cnt int; ok boolean; t1 timestamptz; t2 timestamptz; pts int; xp_before int;
begin
  select value into code from public.app_settings where key = 'invite_code';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_pd_' || u.n || '@test.invalid',
         jsonb_build_object('username', 'ZzPd' || u.n, 'invite_code', code), now(), now()
    from (values (ua, 'A'), (ub, 'B'), (uc, 'C')) u(id, n);
  insert into public.games (name, created_by) values ('ZzPdSolo', ua) returning id into g1;
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzPdAvond', now(), ua, ua, 'live') returning id into n1;
  update public.game_nights set cohost_id = ub where id = n1;

  -- Een potje spelen
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g1) returning id into m1;
  insert into public.match_players (match_id, user_id) values (m1, ua), (m1, ub), (m1, uc);
  perform public.save_score(m1, ua, 1, 'set', 30, 0, gen_random_uuid());
  perform public.save_score(m1, ub, 1, 'set', 20, 0, gen_random_uuid());
  perform public.save_score(m1, uc, 1, 'set', 10, 0, gen_random_uuid());
  perform public.finalize_match(m1);
  reset role;
  select count(*) into cnt from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' P1 tijdens de avond nog geen ceremonie\n';

  -- 14. Mislukte afsluitactie (gewone speler): geen ceremonie
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    perform public.finish_night(n1);
    rep := rep || E'FAIL 14 gewone speler kon de avond afsluiten\n';
  exception when others then rep := rep || E'OK 14 gewone speler kan niet afsluiten\n';
  end;
  update public.game_nights set status = 'finished' where id = n1;
  reset role;
  select count(*) into cnt from public.night_ceremonies where night_id = n1;
  select count(*) into pts from public.game_nights where id = n1 and status = 'finished';
  rep := rep || case when cnt = 0 and pts = 0 then 'OK' else 'FAIL' end || E' 14b mislukt afsluiten: avond niet dicht en geen ceremonie\n';

  -- 8. Host sluit af: precies één ceremonie, recap klaar
  select sum(league_points) into pts from public.match_results where match_id = m1;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.finish_night(n1);
  reset role;
  select count(*), max(closed_at) into cnt, t1 from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 1 and t1 is not null then 'OK' else 'FAIL' end || E' 8 host sluit af: één ceremonie\n';
  select count(*) into cnt from public.activity where night_id = n1 and type = 'night_recap';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 8b recap staat klaar\n';

  -- 13. Nog een keer afsluiten (dubbele tik / tweede verzoek): geen tweede ceremonie
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.finish_night(n1);
  reset role;
  select count(*), max(closed_at) into cnt, t2 from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 1 and t2 = t1 then 'OK' else 'FAIL' end || E' 13 nog eens afsluiten (co-host): geen nieuwe ceremonie\n';

  -- 15. Correctie achteraf: potje heropenen en opnieuw afronden → recap wordt bijgewerkt, geen nieuwe ceremonie
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.reopen_match(m1);
  perform public.save_score(m1, uc, 1, 'add', 50, null, gen_random_uuid());
  perform public.finalize_match(m1);
  reset role;
  select max(closed_at), count(*) into t2, cnt from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 1 and t2 = t1 then 'OK' else 'FAIL' end || E' 15 correctie: geen nieuwe ceremonie\n';
  select ((payload -> 'stats' -> 0 ->> 'user_id')::uuid = uc) into strict ok from (select payload from public.activity where night_id = n1 and type = 'night_recap') x;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 15b recap toont de gecorrigeerde winnaar (C)\n';

  -- 12. De ceremonie verandert niets aan punten (alleen lezen)
  select sum(league_points) into cnt from public.match_results where match_id = m1;
  rep := rep || case when cnt = pts then 'OK' else 'FAIL' end || format(E' 12 punten na afsluiten gelijk gebleven [%s = %s]\n', cnt, pts);

  -- Terug naar gepland en opnieuw afsluiten = een nieuwe afsluiting → nieuwe ceremonie
  update public.game_nights set status = 'planned' where id = n1;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.finish_night(n1);
  reset role;
  select count(*) into cnt from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' P2 opnieuw afgesloten: nog steeds één rij (bijgewerkt)\n';

  -- 4. Avond zonder potjes: wel een (lege) ceremonie, geen recap
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzPdLeeg', now(), ua, ua, 'live') returning id into n2;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.finish_night(n2);
  reset role;
  select count(*) into cnt from public.night_ceremonies where night_id = n2;
  select count(*) into pts from public.activity where night_id = n2 and type = 'night_recap';
  rep := rep || case when cnt = 1 and pts = 0 then 'OK' else 'FAIL' end || E' 4 avond zonder resultaten: nette afsluiting zonder podium\n';

  -- Beveiliging: spelers kunnen niets aan de ceremonie-tabel veranderen
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    insert into public.night_ceremonies (night_id) values (gen_random_uuid());
    rep := rep || E'FAIL S1 speler kon een ceremonie aanmaken\n';
  exception when others then rep := rep || E'OK S1 speler kan geen ceremonie aanmaken\n';
  end;
  update public.night_ceremonies set closed_at = now() where night_id = n1;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' S2 speler kan geen ceremonie opnieuw starten\n';
  select count(*) into cnt from public.night_ceremonies where night_id = n1;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' S3 iedereen mag de ceremonie lezen\n';
  reset role;

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
