-- Test voor het veilig opslaan van conceptscores (save_score / save_team_score),
-- conflicten tussen host en co-host, dubbele verzendingen, afronden en heropenen.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
do $test$
declare
  rep text := E'\n';
  uh uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); up uuid := gen_random_uuid(); ux uuid := gen_random_uuid();
  g1 uuid; g2 uuid; n1 uuid; m1 uuid; m2 uuid; cnt int; t text; j jsonb;
  op1 uuid := gen_random_uuid(); op2 uuid := gen_random_uuid(); op3 uuid := gen_random_uuid();
  op4 uuid := gen_random_uuid(); op5 uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (uh, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_h@test.invalid', '{"username":"ZzHost","invite_code":"player2"}', now(), now()),
   (uc, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_c@test.invalid', '{"username":"ZzCohost","invite_code":"player2"}', now(), now()),
   (up, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_p@test.invalid', '{"username":"ZzSpeler","invite_code":"player2"}', now(), now()),
   (ux, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_x@test.invalid', '{"username":"ZzBuiten","invite_code":"player2"}', now(), now());

  -- Host maakt game, avond, potje
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  insert into public.games (name, created_by) values ('ZzSync', uh) returning id into g1;
  insert into public.games (name, created_by, game_type) values ('ZzTeams', uh, 'teams') returning id into g2;
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzSyncAvond', now(), uh, uh) returning id into n1;
  insert into public.participants (night_id, user_id, status) values (n1, uc, 'confirmed'), (n1, up, 'confirmed');
  update public.game_nights set status = 'live', cohost_id = uc where id = n1;
  insert into public.matches (night_id, game_id) values (n1, g1) returning id into m1;
  insert into public.match_players (match_id, user_id) values (m1, uh), (m1, uc), (m1, up);

  -- 1. Eerste score
  j := public.save_score(m1, up, 1, 'set', 10, 0, op1);
  rep := rep || case when j->>'status' = 'ok' and (j->>'points')::numeric = 10 and (j->>'version')::int = 1 then 'OK' else 'FAIL' end || ' 1 eerste score opgeslagen ' || j::text || E'\n';

  -- 2. Zelfde wijziging nog een keer (haperende verbinding) telt niet dubbel
  j := public.save_score(m1, up, 1, 'set', 10, 0, op1);
  select points::text || '/' || version into t from public.score_entries where match_id = m1 and user_id = up and round = 1;
  rep := rep || case when j->>'status' = 'ok' and t = '10/1' then 'OK' else 'FAIL' end || ' 2 dubbele verzending genegeerd (' || t || E')\n';

  -- 3. +1 nog een keer versturen telt ook niet dubbel
  j := public.save_score(m1, up, 1, 'add', 1, 1, op2);
  j := public.save_score(m1, up, 1, 'add', 1, 1, op2);
  select points::text into t from public.score_entries where match_id = m1 and user_id = up and round = 1;
  rep := rep || case when t = '11' then 'OK' else 'FAIL' end || ' 3 dubbele +1 telt één keer (' || t || E')\n';
  reset role;

  -- 4. Co-host telt tegelijk punten bij: beide tellen op
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  j := public.save_score(m1, up, 1, 'add', 5, 1, gen_random_uuid());
  j := public.save_score(m1, uh, 1, 'set', 7, 0, gen_random_uuid());
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  j := public.save_score(m1, up, 1, 'add', 3, 1, gen_random_uuid());
  select points::text || '/v' || version into t from public.score_entries where match_id = m1 and user_id = up and round = 1;
  rep := rep || case when t = '19/v4' then 'OK' else 'FAIL' end || ' 4 host en co-host tellen tegelijk op (' || t || E')\n';

  -- 5. Vaste waarde op een verouderde versie = conflict, niks overschreven
  j := public.save_score(m1, up, 1, 'set', 30, 1, op3);
  select points::text into t from public.score_entries where match_id = m1 and user_id = up and round = 1;
  rep := rep || case when j->>'status' = 'conflict' and (j->>'points')::numeric = 19 and t = '19' then 'OK' else 'FAIL' end || ' 5 conflict gemeld, niks overschreven ' || j::text || E'\n';
  rep := rep || case when j->>'by' = uh::text then 'OK' else 'FAIL' end || E' 5b conflict zegt wie het laatst wijzigde\n';

  -- 6. Dezelfde (geweigerde) wijziging opnieuw: weer conflict, niet stilletjes "ok"
  j := public.save_score(m1, up, 1, 'set', 30, 1, op3);
  rep := rep || case when j->>'status' = 'conflict' then 'OK' else 'FAIL' end || E' 6 herhaald conflict blijft conflict\n';

  -- 7. Met de juiste versie lukt het wel
  j := public.save_score(m1, up, 1, 'set', 30, 4, op4);
  rep := rep || case when j->>'status' = 'ok' and (j->>'version')::int = 5 then 'OK' else 'FAIL' end || E' 7 met actuele versie opgeslagen\n';

  -- 8. Zelfde waarde op oude versie is geen conflict
  j := public.save_score(m1, up, 1, 'set', 30, 2, gen_random_uuid());
  rep := rep || case when j->>'status' = 'ok' then 'OK' else 'FAIL' end || E' 8 zelfde waarde = geen conflict\n';

  -- 9. Leegmaken
  j := public.save_score(m1, uh, 2, 'set', 4, 0, gen_random_uuid());
  j := public.save_score(m1, uh, 2, 'set', null, (j->>'version')::int, gen_random_uuid());
  select coalesce(points::text, 'leeg') into t from public.score_entries where match_id = m1 and user_id = uh and round = 2;
  rep := rep || case when j->>'status' = 'ok' and t = 'leeg' then 'OK' else 'FAIL' end || ' 9 cel leegmaken (' || t || E')\n';

  -- 10. Ongeldige invoer
  begin
    perform public.save_score(m1, ux, 1, 'set', 5, 0, gen_random_uuid());
    rep := rep || E'FAIL 10 score voor iemand die niet meedoet\n';
  exception when others then rep := rep || E'OK 10 alleen spelers van het potje\n';
  end;
  begin
    perform public.save_score(m1, up, 0, 'set', 5, 0, gen_random_uuid());
    rep := rep || E'FAIL 10b ronde 0 toegestaan\n';
  exception when others then rep := rep || E'OK 10b ongeldige ronde geweigerd\n';
  end;
  begin
    perform public.save_score(m1, up, 1, 'add', 5000000, 0, gen_random_uuid());
    rep := rep || E'FAIL 10c absurde score toegestaan\n';
  exception when others then rep := rep || E'OK 10c absurde score geweigerd\n';
  end;
  reset role;

  -- 11. Gewone speler en buitenstaander mogen niks
  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', up::text, true);
  set local role authenticated;
  begin
    perform public.save_score(m1, up, 1, 'add', 100, 0, gen_random_uuid());
    rep := rep || E'FAIL 11 speler kon eigen score aanpassen\n';
  exception when others then rep := rep || E'OK 11 speler kan geen scores aanpassen\n';
  end;
  begin
    insert into public.score_ops (op_id, match_id) values (gen_random_uuid(), m1);
    rep := rep || E'FAIL 11b score_ops direct beschreven\n';
  exception when others then rep := rep || E'OK 11b score_ops afgeschermd\n';
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ux::text, true);
  set local role authenticated;
  begin
    perform public.save_score(m1, up, 1, 'add', 100, 0, gen_random_uuid());
    rep := rep || E'FAIL 11c buitenstaander kon score aanpassen\n';
  exception when others then rep := rep || E'OK 11c buitenstaander kan geen scores aanpassen\n';
  end;
  reset role;

  -- 12. Concept telt niet mee voor de ranglijst
  select count(*) into cnt from public.match_results where match_id = m1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 12 conceptscores staan niet in de uitslag\n';
  select count(*) into cnt from public.activity where match_id = m1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 12b geen nieuws tijdens het potje\n';

  -- 13. Afronden: uitslag officieel (Speler 30, Host 7, Co-host 0)
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  perform public.finalize_match(m1);
  reset role;
  select string_agg(p.username || ':' || r.total || '/#' || r.placement || case when r.is_winner then '/WIN' else '' end, ', ' order by r.placement)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m1;
  rep := rep || case when t = 'ZzSpeler:30/#1/WIN, ZzHost:7/#2, ZzCohost:0/#3' then 'OK' else 'FAIL' end || ' 13 uitslag: ' || t || E'\n';

  -- 14. Na afronden: concepten worden niet meer aangenomen, dubbel afronden kan niet
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  j := public.save_score(m1, uh, 1, 'add', 50, 1, gen_random_uuid());
  rep := rep || case when j->>'status' = 'closed' then 'OK' else 'FAIL' end || E' 14 afgerond potje neemt geen scores meer aan\n';
  begin
    perform public.finalize_match(m1);
    rep := rep || E'FAIL 14b twee keer afronden\n';
  exception when others then rep := rep || E'OK 14b twee keer afronden kan niet\n';
  end;
  reset role;
  select count(*) into cnt from public.match_results where match_id = m1;
  rep := rep || case when cnt = 3 then 'OK' else 'FAIL' end || E' 14c geen dubbele uitslag\n';
  select count(*) into cnt from public.activity where match_id = m1 and type = 'match_finished';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 14d één nieuwsbericht\n';

  -- 15. Avond afsluiten: samenvatting met Speler als MVP
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  perform public.finish_night(n1);
  reset role;
  select (actor_id = up)::text into t from public.activity where night_id = n1 and type = 'night_recap';
  rep := rep || case when t = 'true' then 'OK' else 'FAIL' end || E' 15 MVP in de samenvatting\n';

  -- 16. Foutje: eigenlijk won de host. Heropenen, corrigeren, opnieuw afronden.
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  perform public.reopen_match(m1);
  reset role;
  select count(*) into cnt from public.match_results where match_id = m1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 16 heropenen haalt de uitslag weg\n';
  select count(*) into cnt from public.activity where match_id = m1;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 16b heropenen haalt het nieuws weg\n';
  select count(*) into cnt from public.activity where night_id = n1 and type = 'night_recap';
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 16c samenvatting bijgewerkt (geen afgeronde potjes meer)\n';
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  select version into cnt from public.score_entries where match_id = m1 and user_id = uh and round = 1;
  j := public.save_score(m1, uh, 1, 'set', 40, cnt, op5);
  rep := rep || case when j->>'status' = 'ok' then 'OK' else 'FAIL' end || E' 16d score corrigeren na heropenen\n';
  perform public.finalize_match(m1);
  reset role;
  select string_agg(p.username || case when r.is_winner then '/WIN' else '' end, ', ' order by r.placement)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m1;
  rep := rep || case when t = 'ZzHost/WIN, ZzSpeler, ZzCohost' then 'OK' else 'FAIL' end || ' 16e nieuwe uitslag: ' || t || E'\n';
  select count(*) into cnt from public.match_results where match_id = m1 and is_winner;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 16f precies één winnaar\n';
  select count(*) into cnt from public.activity where match_id = m1 and type = 'match_finished';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 16g geen dubbel nieuws\n';
  select count(*) || '/' || bool_and(actor_id = uh)::text into t from public.activity where night_id = n1 and type = 'night_recap';
  rep := rep || case when t = '1/true' then 'OK' else 'FAIL' end || ' 16h samenvatting opnieuw: host is MVP (' || t || E')\n';
  select coalesce(sum(league_points), 0)::text into t from public.match_results where user_id = up;
  rep := rep || case when (select count(*) from public.match_results where user_id = up and is_winner) = 0 then 'OK' else 'FAIL' end || E' 16i speler heeft geen zege meer\n';

  -- 17. Teamscores: host en co-host tellen tegelijk, conflict bij vaste waarde
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uh::text, true);
  set local role authenticated;
  update public.game_nights set status = 'live' where id = n1;
  insert into public.matches (night_id, game_id) values (n1, g2) returning id into m2;
  insert into public.match_players (match_id, user_id, team) values (m2, uh, 'Rood'), (m2, uc, 'Blauw'), (m2, up, 'Blauw');
  j := public.save_team_score(m2, 'Rood', 1, 'add', 25, 0, gen_random_uuid());
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  j := public.save_team_score(m2, 'Rood', 1, 'add', 5, 0, gen_random_uuid());
  j := public.save_team_score(m2, 'Blauw', 1, 'set', 12, 0, gen_random_uuid());
  j := public.save_team_score(m2, 'Rood', 1, 'set', 99, 0, gen_random_uuid());
  rep := rep || case when j->>'status' = 'conflict' and (j->>'points')::numeric = 30 then 'OK' else 'FAIL' end || E' 17 teamscore conflict gemeld\n';
  perform public.finalize_teams_match(m2);
  reset role;
  select string_agg(p.username || case when r.is_winner then '/WIN' else '' end, ', ' order by p.username)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m2;
  rep := rep || case when t = 'ZzCohost, ZzHost/WIN, ZzSpeler' then 'OK' else 'FAIL' end || ' 17b team Rood (30) wint van Blauw (12): ' || t || E'\n';

  raise exception 'TESTRAPPORT (alles teruggedraaid):%', rep;
end
$test$;
