-- Speelt een complete gamenight door met 3 nep-spelers en controleert
-- aanmelden, rechten, stemmen, scores, winnaar/gelijkspel en ranglijsten.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
-- Het testrapport staat in de foutmelding.
do $test$
declare
  rep text := E'\n';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  g1 uuid; g2 uuid; n1 uuid; m1 uuid; m2 uuid; cnt int; t text;
begin
  -- 1. Foute uitnodigingscode
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_fout@test.invalid', '{"username":"ZzFout","invite_code":"FOUT"}', now(), now());
    rep := rep || E'FAIL 1 foute code werd geaccepteerd\n';
  exception when others then rep := rep || E'OK 1 foute uitnodigingscode geweigerd\n';
  end;

  -- 2. Drie testspelers met juiste code (hoofdletters/spaties maken niet uit)
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_a@test.invalid', '{"username":"ZzTestA","invite_code":"player2","avatar_color":"blue"}', now(), now()),
   (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_b@test.invalid', '{"username":"ZzTestB","invite_code":"PLAYER2"}', now(), now()),
   (uc, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_c@test.invalid', '{"username":"ZzTestC","invite_code":" Player2 "}', now(), now());
  select count(*) into cnt from public.profiles where id in (ua, ub, uc);
  rep := rep || case when cnt = 3 then 'OK' else 'FAIL' end || E' 2 drie profielen aangemaakt\n';
  select avatar_color into t from public.profiles where id = ua;
  rep := rep || case when t = 'blue' then 'OK' else 'FAIL' end || E' 2b gekozen kleur opgeslagen\n';
  rep := rep || case when not public.username_available('zztesta') then 'OK' else 'FAIL' end || E' 3 naam bezet (hoofdletterongevoelig)\n';

  -- 4. A voegt games toe en plant een avond met B als host
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.games (name, created_by) values ('ZzKart', ua) returning id into g1;
  insert into public.games (name, created_by, scoring_mode) values ('ZzGolf', ua, 'lowest_wins') returning id into g2;
  begin
    insert into public.games (name, created_by) values ('ZzNep', ub);
    rep := rep || E'FAIL 4b game op andermans naam toegestaan\n';
  exception when others then rep := rep || E'OK 4b game op andermans naam geweigerd\n';
  end;
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzAvond', now() + interval '1 day', ub, ua) returning id into n1;
  reset role;
  select count(*) into cnt from public.participants where night_id = n1 and user_id = ub and status = 'confirmed';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 5 host automatisch bevestigd\n';

  -- 6. C meldt zich aan en probeert vals te spelen
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  insert into public.participants (night_id, user_id) values (n1, uc);
  begin
    insert into public.participants (night_id, user_id, status) values (n1, ua, 'confirmed');
    rep := rep || E'FAIL 6 C kon A bevestigd toevoegen\n';
  exception when others then rep := rep || E'OK 6 C kan geen anderen toevoegen\n';
  end;
  update public.participants set status = 'confirmed' where night_id = n1 and user_id = uc;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 6b C kan zichzelf niet bevestigen\n';
  insert into public.votes (night_id, user_id, game_id) values (n1, uc, g2);
  insert into public.votes (night_id, user_id, game_id) values (n1, uc, g1)
    on conflict (night_id, user_id) do update set game_id = excluded.game_id;
  reset role;

  -- 7. A stemt
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.votes (night_id, user_id, game_id) values (n1, ua, g1);
  begin
    insert into public.votes (night_id, user_id, game_id) values (n1, ua, g2);
    rep := rep || E'FAIL 7 dubbel stemmen toegestaan\n';
  exception when others then rep := rep || E'OK 7 maar een stem per persoon\n';
  end;
  begin
    insert into public.matches (night_id, game_id) values (n1, g1);
    rep := rep || E'FAIL 8 niet-host kon potje starten\n';
  exception when others then rep := rep || E'OK 8 niet-host kan geen potje starten\n';
  end;
  reset role;
  select count(*) into cnt from public.votes where night_id = n1 and game_id = g1;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || E' 7b stemmen geteld (stem van C verplaatst)\n';

  -- 9. Host B: bevestigen, A toevoegen, starten, potje 1 (hoogste wint)
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  update public.participants set status = 'confirmed' where night_id = n1 and user_id = uc;
  insert into public.participants (night_id, user_id, status) values (n1, ua, 'confirmed');
  update public.game_nights set status = 'live' where id = n1;
  insert into public.matches (night_id, game_id) values (n1, g1) returning id into m1;
  insert into public.match_players values (m1, ua), (m1, ub), (m1, uc);
  insert into public.score_entries (match_id, user_id, round, points) values
    (m1, ua, 1, 6), (m1, ua, 2, 4), (m1, ub, 1, 3), (m1, ub, 2, 4), (m1, uc, 1, 7), (m1, uc, 2, 0);
  insert into public.score_entries (match_id, user_id, round, points) values (m1, ua, 2, 4.5)
    on conflict (match_id, user_id, round) do update set points = excluded.points;
  perform public.finalize_match(m1);
  reset role;
  select count(*) into cnt from public.participants where night_id = n1 and status = 'confirmed';
  rep := rep || case when cnt = 3 then 'OK' else 'FAIL' end || E' 9 host bevestigt en voegt toe\n';
  select string_agg(p.username || ':' || r.total || '/#' || r.placement || '/' || r.league_points || 'pt' || case when r.is_winner then '/WIN' else '' end, ', ' order by r.placement, p.username)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m1;
  rep := rep || case when t = 'ZzTestA:10.5/#1/10pt/WIN, ZzTestB:7/#2/6pt, ZzTestC:7/#2/6pt' then 'OK' else 'FAIL' end || ' 10 potje 1 uitslag: ' || t || E'\n';

  -- 11. Stemmen dicht, afronden alleen door host
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    update public.votes set game_id = g2 where night_id = n1 and user_id = uc;
    get diagnostics cnt = row_count;
    rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 11 stemmen dicht zodra avond live is\n';
  exception when others then rep := rep || E'OK 11 stemmen dicht zodra avond live is\n';
  end;
  begin
    perform public.finalize_match(m1);
    rep := rep || E'FAIL 11b niet-host kon afronden\n';
  exception when others then rep := rep || E'OK 11b niet-host kan niet afronden\n';
  end;
  reset role;

  -- 12. Potje 2: laagste score wint, gelijke stand bovenaan
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  begin
    insert into public.score_entries (match_id, user_id, round, points) values (m1, ua, 3, 50);
    rep := rep || E'FAIL 12 scores van afgerond potje aanpasbaar\n';
  exception when others then rep := rep || E'OK 12 afgerond potje zit op slot\n';
  end;
  insert into public.matches (night_id, game_id) values (n1, g2) returning id into m2;
  insert into public.match_players values (m2, ua), (m2, ub), (m2, uc);
  insert into public.score_entries (match_id, user_id, round, points) values (m2, ua, 1, 5), (m2, ub, 1, 3), (m2, uc, 1, 3);
  perform public.finalize_match(m2);
  reset role;
  select is_draw::text || '/' || coalesce(winner_id::text, 'geen') into t from public.matches where id = m2;
  rep := rep || case when t = 'true/geen' then 'OK' else 'FAIL' end || ' 13 gelijke stand = geen winnaar (' || t || E')\n';
  select string_agg(p.username || ':#' || r.placement || '/' || r.league_points, ', ' order by r.placement, p.username)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m2;
  rep := rep || case when t = 'ZzTestB:#1/10, ZzTestC:#1/10, ZzTestA:#3/4' then 'OK' else 'FAIL' end || ' 13b laagste wint: ' || t || E'\n';

  -- 14. Ranglijsten
  select string_agg(p.username || ' #' || l.rank || ' ' || l.points || 'pt ' || l.wins || 'w', ', ' order by l.rank, p.username)
    into t from public.overall_leaderboard l join public.profiles p on p.id = l.user_id where p.username like 'ZzTest%';
  rep := rep || case when t = 'ZzTestB #1 16pt 0w, ZzTestC #1 16pt 0w, ZzTestA #3 14pt 1w' then 'OK' else 'CHECK' end || ' 14 algemeen klassement: ' || t || E'\n';
  select string_agg(p.username || ' #' || l.rank, ', ' order by l.rank, p.username)
    into t from public.game_leaderboard l join public.profiles p on p.id = l.user_id where l.game_id = g1;
  rep := rep || case when t = 'ZzTestA #1, ZzTestB #2, ZzTestC #2' then 'OK' else 'FAIL' end || ' 14b leaderboard ZzKart: ' || t || E'\n';

  -- 15. Nieuwsfeed
  select string_agg(type, ',' order by id) into t from public.activity where actor_id in (ua, ub, uc) or game_id in (g1, g2) or night_id = n1;
  rep := rep || 'INFO 15 nieuws: ' || t || E'\n';

  -- 16-18. Rechten van een gewone speler
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    perform public.reopen_match(m2);
    rep := rep || E'FAIL 16 niet-host kon heropenen\n';
  exception when others then rep := rep || E'OK 16 niet-host kan niet heropenen\n';
  end;
  update public.profiles set username = 'Gehackt' where id = ua;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 17 kan andermans profiel niet wijzigen\n';
  update public.profiles set bio = 'test' where id = uc;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 17b eigen profiel wijzigen werkt\n';
  delete from public.game_nights where id = n1;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 18 gewone speler kan avond niet verwijderen\n';
  reset role;

  -- 19. Host heropent, corrigeert en rondt opnieuw af
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.reopen_match(m2);
  select count(*) into cnt from public.match_results where match_id = m2;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 19 heropenen haalt punten weg\n';
  update public.score_entries set points = 2 where match_id = m2 and user_id = uc;
  perform public.finalize_match(m2);
  select coalesce((select username from public.profiles where id = winner_id), 'geen') into t from public.matches where id = m2;
  rep := rep || case when t = 'ZzTestC' then 'OK' else 'FAIL' end || ' 19b na correctie wint ' || t || E'\n';
  reset role;

  -- 20-21. Games en seizoensgegevens
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  delete from public.games where id = g1;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 20 game met potjes niet verwijderbaar\n';
  select count(*) into cnt from public.match_results r join public.matches m on m.id = r.match_id where m.finished_at is not null and r.match_id in (m1, m2);
  rep := rep || case when cnt = 6 then 'OK' else 'FAIL' end || E' 21 resultaten met datum leesbaar (seizoenen)\n';
  reset role;

  -- 23. Teamspel: meerdere winnaars bij gelijke stand bovenaan
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.games (name, created_by, is_team) values ('ZzWolven', ua, true) returning id into g2;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g2) returning id into m2;
  insert into public.match_players values (m2, ua), (m2, ub), (m2, uc);
  insert into public.score_entries (match_id, user_id, round, points) values (m2, ua, 1, 1), (m2, ub, 1, 1), (m2, uc, 1, 0);
  perform public.finalize_match(m2);
  insert into public.matches (night_id, game_id) values (n1, g2) returning id into m1;
  insert into public.match_players values (m1, ua), (m1, ub);
  insert into public.score_entries (match_id, user_id, round, points) values (m1, ua, 1, 1), (m1, ub, 1, 1);
  perform public.finalize_match(m1);
  reset role;
  select string_agg(p.username || case when r.is_winner then ':WIN' else ':-' end, ', ' order by p.username)
    into t from public.match_results r join public.profiles p on p.id = r.user_id where r.match_id = m2;
  select t || ' | draw=' || is_draw::text into t from public.matches where id = m2;
  rep := rep || case when t = 'ZzTestA:WIN, ZzTestB:WIN, ZzTestC:- | draw=false' then 'OK' else 'FAIL' end || ' 23 teamspel twee winnaars: ' || t || E'\n';
  select is_draw::text into t from public.matches where id = m1;
  rep := rep || case when t = 'true' then 'OK' else 'FAIL' end || E' 23b teamspel iedereen gelijk = gelijkspel\n';
  select payload::text into t from public.activity where match_id = m2 and type = 'match_finished';
  rep := rep || case when t like '%"team": true%' then 'OK' else 'FAIL' end || ' 23c nieuws teamwinst: ' || t || E'\n';

  -- 22. Niet ingelogd
  set local role anon;
  begin
    select count(*) into cnt from public.profiles;
    rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 22 niet ingelogd ziet geen gegevens\n';
  exception when others then rep := rep || E'OK 22 niet ingelogd ziet geen gegevens\n';
  end;
  begin
    select value into t from public.app_settings limit 1;
    rep := rep || E'FAIL 22b uitnodigingscode leesbaar\n';
  exception when others then rep := rep || E'OK 22b uitnodigingscode geheim\n';
  end;
  reset role;

  raise exception 'TESTRAPPORT (alles teruggedraaid):%', rep;
end
$test$;
