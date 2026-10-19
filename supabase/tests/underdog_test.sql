-- Underdog Bonus: test alle belangrijke situaties.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid. Het rapport staat in de foutmelding.
-- Stukken tussen [lokaal] en [/lokaal] draaien alleen in de lokale testdatabase.
do $test$
declare
  rep text := E'\n';
  code text;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ud uuid := gen_random_uuid(); ue uuid := gen_random_uuid(); uf uuid := gen_random_uuid();
  g_solo uuid; g_team uuid; g_role uuid;
  n0 uuid; n1 uuid; np uuid;
  s1 uuid; s2 uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid; mp uuid;
  cnt int; v int; v2 int; t text; ok boolean; op uuid := gen_random_uuid();
  r record;
begin
  select value into code from public.app_settings where key = 'invite_code';

  -- Echte resultaten van dit seizoen even "wegzetten" (alleen binnen deze test; alles wordt teruggedraaid)
  update public.matches set finished_at = finished_at - interval '10 years' where finished_at is not null;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_ud_' || u.n || '@test.invalid',
         jsonb_build_object('username', 'ZzUd' || u.n, 'invite_code', code), now(), now()
    from (values (ua, 'A'), (ub, 'B'), (uc, 'C'), (ud, 'D'), (ue, 'E'), (uf, 'F')) u(id, n);

  insert into public.games (name, created_by) values ('ZzUdSolo', ua) returning id into g_solo;
  insert into public.games (name, created_by, game_type) values ('ZzUdTeams', ua, 'teams') returning id into g_team;
  insert into public.games (name, created_by, game_type, teams)
  values ('ZzUdRollen', ua, 'roles', '[{"name":"Dorp","points":8},{"name":"Wolven","points":12}]') returning id into g_role;

  -- Seizoensstand opbouwen (voorbeeld uit de opdracht): A300 B260 C200 D150 E100 F80
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzUdBasis', now() - interval '1 day', ua, ua, 'finished') returning id into n0;
  insert into public.matches (night_id, game_id, status, finished_at) values (n0, g_solo, 'finished', now()) returning id into s1;
  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner) values
    (s1, ua, g_solo, 0, 1, 300, false), (s1, ub, g_solo, 0, 2, 260, false), (s1, uc, g_solo, 0, 3, 200, false),
    (s1, ud, g_solo, 0, 4, 150, false), (s1, ue, g_solo, 0, 5, 100, false), (s1, uf, g_solo, 0, 6, 80, false);

  -- 1. Twee spelers kwalificeren
  select count(*), min(ref_points), min(threshold) into cnt, v, v2 from private.current_underdogs() where user_id in (ue, uf);
  rep := rep || case when cnt = 2 and v = 150 and v2 = 30 and (select count(*) from private.current_underdogs()) = 2 then 'OK' else 'FAIL' end
             || format(E' 1 twee underdogs (E en F), referentie 150, drempel 30 [%s, %s, %s]\n', cnt, v, v2);
  select rank into v from private.current_underdogs() where user_id = uf;
  rep := rep || case when v = 6 then 'OK' else 'FAIL' end || format(E' 1b positie F = 6 [%s]\n', v);

  -- 2. Eén speler kwalificeert (E staat maar 20 achter)
  update public.match_results set league_points = 130 where match_id = s1 and user_id = ue;
  select count(*) into cnt from private.current_underdogs();
  select count(*) into v from private.current_underdogs() where user_id = uf;
  rep := rep || case when cnt = 1 and v = 1 then 'OK' else 'FAIL' end || format(E' 2 alleen F kwalificeert [%s]\n', cnt);

  -- 3. Niemand kwalificeert
  update public.match_results set league_points = 140 where match_id = s1 and user_id = uf;
  select count(*) into cnt from private.current_underdogs();
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || format(E' 3 niemand kwalificeert [%s]\n', cnt);

  -- 8. Gelijke punten
  update public.match_results set league_points = 100 where match_id = s1 and user_id in (ue, uf);
  select count(*) into cnt from private.current_underdogs() where rank = 5;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || format(E' 8 E en F gelijk (100): allebei underdog, gedeelde plek 5 [%s]\n', cnt);
  update public.match_results set league_points = case user_id when ud then 100 when ue then 100 else 80 end
   where match_id = s1 and user_id in (ud, ue, uf);
  select count(*) into cnt from private.current_underdogs();
  select threshold into v from private.current_underdogs() where user_id = uf;
  rep := rep || case when cnt = 1 and v = 20 then 'OK' else 'FAIL' end
             || format(E' 8b D en E gelijk op 100: geen achterstand t.o.v. elkaar, alleen F (drempel 20) [%s, %s]\n', cnt, v);
  update public.match_results mr set is_winner = (mr.user_id = ue) where match_id = s1 and user_id in (ud, ue);
  select count(*) into cnt from private.current_underdogs();
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || format(E' 8c gelijk op punten, meer zeges: officiële volgorde gebruikt, nog steeds alleen F [%s]\n', cnt);
  update public.match_results set is_winner = false where match_id = s1;

  -- Drempel: minimaal 10, afronden naar boven
  update public.match_results set league_points = case user_id when ua then 40 when ub then 30 when uc then 20 when ud then 12 when ue then 2 else 0 end where match_id = s1;
  select count(*), min(threshold) into cnt, v from private.current_underdogs();
  rep := rep || case when cnt = 2 and v = 10 then 'OK' else 'FAIL' end || format(E' 8d minimale drempel 10 punten [%s, %s]\n', cnt, v);
  update public.match_results set league_points = case user_id when ua then 300 when ub then 260 when uc then 200 when ud then 151 when ue then 121 else 120 end where match_id = s1;
  select count(*), min(threshold) into cnt, v from private.current_underdogs();
  select count(*) into v2 from private.current_underdogs() where user_id = uf;
  rep := rep || case when cnt = 1 and v = 31 and v2 = 1 then 'OK' else 'FAIL' end || format(E' 8e 20%% van 151 = 30,2 → 31; E (30 achter) niet, F (31 achter) wel [%s, %s]\n', cnt, v);

  -- 10. Nieuw seizoen: oude resultaten blijven bewaard, niemand is underdog
  update public.matches set finished_at = now() - interval '1 year' where id = s1;
  select count(*) into cnt from private.current_underdogs();
  select count(*) into v from public.match_results where match_id = s1;
  rep := rep || case when cnt = 0 and v = 6 then 'OK' else 'FAIL' end || format(E' 10 nieuw seizoen: niemand underdog, oude uitslag bewaard [%s, %s]\n', cnt, v);

  -- 9. Minder dan vier spelers in het seizoen
  insert into public.matches (night_id, game_id, status, finished_at) values (n0, g_solo, 'finished', now()) returning id into s2;
  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner) values
    (s2, ua, g_solo, 0, 1, 100, false), (s2, ub, g_solo, 0, 2, 50, false), (s2, uc, g_solo, 0, 3, 0, false);
  select count(*) into cnt from private.current_underdogs();
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || format(E' 9 maar 3 spelers in het seizoen: geen underdogs [%s]\n', cnt);
  update public.matches set finished_at = now() - interval '1 year' where id = s2;

  -- Terug naar de stand uit het voorbeeld
  update public.matches set finished_at = now() where id = s1;
  update public.match_results set league_points = case user_id when ua then 300 when ub then 260 when uc then 200 when ud then 150 when ue then 100 else 80 end where match_id = s1;

  -- Oefenavond: geen underdogstatus
  insert into public.game_nights (title, starts_at, host_id, created_by, is_practice) values ('ZzUdOefen', now(), ua, ua, true) returning id into np;
  update public.game_nights set cohost_id = ub where id = np;
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzUdAvond', now(), ua, ua, 'live') returning id into n1;
  update public.game_nights set cohost_id = ub where id = n1;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (np, g_solo) returning id into mp;
  insert into public.match_players (match_id, user_id) values (mp, ua), (mp, ue), (mp, uf);
  reset role;
  select count(*) into cnt from public.match_underdogs where match_id = mp;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || format(E' 0 oefenavond: geen underdogbonus [%s]\n', cnt);

  -- Potje 1 (solo) start: status wordt vastgelegd
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g_solo) returning id into m1;
  insert into public.match_players (match_id, user_id) values (m1, ua), (m1, uc), (m1, ue), (m1, uf);
  select count(*) into cnt from public.match_underdogs where match_id = m1;
  reset role;
  select (rank = 5 and points = 100 and ref_points = 150 and threshold = 30 and bonus = 2 and season = private.season_key(now()))
    into ok from public.match_underdogs where match_id = m1 and user_id = ue;
  rep := rep || case when cnt = 2 and ok then 'OK' else 'FAIL' end || format(E' 4a start: E en F vastgelegd met positie, punten, referentie, drempel en bonus [%s]\n', cnt);

  -- 11 (beveiliging). Spelers en host kunnen niets aan de bonus veranderen
  perform set_config('request.jwt.claims', json_build_object('sub', uf, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uf::text, true);
  set local role authenticated;
  begin
    insert into public.match_underdogs (match_id, user_id, season, rank, points, ref_points, threshold) values (m1, uc, 'x', 1, 1, 1, 1);
    rep := rep || E'FAIL S1 speler kon zichzelf underdog maken\n';
  exception when others then rep := rep || E'OK S1 speler kan geen underdogstatus toevoegen\n';
  end;
  update public.match_underdogs set bonus = 50 where match_id = m1;
  get diagnostics cnt = row_count;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' S2 speler kan bonus niet verhogen\n';
  begin
    update public.match_results set league_points = 999 where match_id = s1 and user_id = uf;
    get diagnostics cnt = row_count;
    rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' S3 speler kan competitiepunten niet aanpassen\n';
  exception when others then rep := rep || E'OK S3 speler kan competitiepunten niet aanpassen\n';
  end;
  begin
    perform private.current_underdogs();
    rep := rep || E'FAIL S4 speler kan interne functie aanroepen\n';
  exception when others then rep := rep || E'OK S4 interne berekening is afgeschermd\n';
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    insert into public.match_underdogs (match_id, user_id, season, rank, points, ref_points, threshold) values (m1, uc, 'x', 1, 1, 1, 1);
    rep := rep || E'FAIL S5 host kon iemand underdog maken\n';
  exception when others then rep := rep || E'OK S5 ook de host kan geen underdogstatus toevoegen\n';
  end;

  -- 13. Offline: dezelfde score twee keer versturen telt maar één keer
  perform public.save_score(m1, ue, 1, 'add', 50, null, op);
  perform public.save_score(m1, ue, 1, 'add', 50, null, op);
  perform public.save_score(m1, ua, 1, 'set', 40, 0, gen_random_uuid());
  perform public.save_score(m1, uc, 1, 'set', 30, 0, gen_random_uuid());
  perform public.save_score(m1, uf, 1, 'set', 20, 0, gen_random_uuid());
  select points into v from public.score_entries where match_id = m1 and user_id = ue and round = 1;
  rep := rep || case when v = 50 then 'OK' else 'FAIL' end || format(E' 13 offline dubbel verstuurde score telt één keer [%s]\n', v);

  -- 4. Underdog wint
  perform public.finalize_match(m1);
  reset role;
  select league_points, underdog_bonus into v, v2 from public.match_results where match_id = m1 and user_id = ue;
  rep := rep || case when v = 12 and v2 = 2 then 'OK' else 'FAIL' end || format(E' 4 E wint als underdog: 10 + 2 = 12 [%s, bonus %s]\n', v, v2);
  select (winner_id = ue and not is_draw) into ok from public.matches where id = m1;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 4b winnaarslogica ongewijzigd (E is gewoon de winnaar)\n';
  select count(*) into cnt from public.activity where type = 'underdog_win' and match_id = m1 and actor_id = ue;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || format(E' 4c één nieuwsbericht "underdog victory" [%s]\n', cnt);
  -- 5. Underdog verliest
  select league_points, underdog_bonus into v, v2 from public.match_results where match_id = m1 and user_id = uf;
  rep := rep || case when v = 2 and v2 = 0 then 'OK' else 'FAIL' end || format(E' 5 F verliest (4e): gewoon 2 punten, geen bonus [%s, %s]\n', v, v2);
  select league_points, underdog_bonus into v, v2 from public.match_results where match_id = m1 and user_id = ua;
  rep := rep || case when v = 6 and v2 = 0 then 'OK' else 'FAIL' end || format(E' 5b gewone speler: basispunten ongewijzigd [%s, %s]\n', v, v2);
  select points into v from public.overall_leaderboard where user_id = ue;
  rep := rep || case when v = 112 then 'OK' else 'FAIL' end || format(E' 5c ranglijst telt de bonus mee (100 + 12 = 112) [%s]\n', v);

  -- 15. Herhaald opslaan van dezelfde uitslag
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    perform public.finalize_match(m1);
    rep := rep || E'FAIL 15 dezelfde uitslag kon twee keer worden opgeslagen\n';
  exception when others then rep := rep || E'OK 15 tweede keer opslaan wordt geweigerd\n';
  end;
  reset role;
  -- 14. Host en cohost tegelijk: de tweede (cohost) krijgt "al afgerond"
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  begin
    perform public.finalize_match(m1);
    rep := rep || E'FAIL 14 cohost kon een al afgeronde uitslag nog eens opslaan\n';
  exception when others then rep := rep || E'OK 14 cohost na host: geweigerd, geen dubbele bonus\n';
  end;
  reset role;
  select sum(underdog_bonus), count(*) into v, cnt from public.match_results where match_id = m1;
  rep := rep || case when v = 2 and cnt = 4 then 'OK' else 'FAIL' end || format(E' 15b in totaal precies één bonus van 2 [%s, %s rijen]\n', v, cnt);

  -- 11. Correctie door de cohost: F blijkt gewonnen te hebben
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.reopen_match(m1);
  reset role;
  select count(*) into cnt from public.match_results where match_id = m1;
  select points into v from public.overall_leaderboard where user_id = ue;
  rep := rep || case when cnt = 0 and v = 100 then 'OK' else 'FAIL' end || format(E' 11a heropenen: bonus en punten teruggedraaid [%s, %s]\n', cnt, v);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.save_score(m1, uf, 1, 'add', 99, null, gen_random_uuid());
  perform public.finalize_match(m1);
  reset role;
  select underdog_bonus into v from public.match_results where match_id = m1 and user_id = ue;
  select league_points, underdog_bonus into v2, cnt from public.match_results where match_id = m1 and user_id = uf;
  rep := rep || case when v = 0 and v2 = 12 and cnt = 2 then 'OK' else 'FAIL' end || format(E' 11 correctie: E verliest bonus, F krijgt 10 + 2 [E %s, F %s]\n', v, v2);
  select count(*) filter (where actor_id = ue), count(*) filter (where actor_id = uf) into v, v2
    from public.activity where type = 'underdog_win' and match_id = m1;
  rep := rep || case when v = 0 and v2 = 1 then 'OK' else 'FAIL' end || format(E' 11b nieuws klopt na correctie [E %s, F %s]\n', v, v2);
  select points into v from public.match_underdogs where match_id = m1 and user_id = ue;
  rep := rep || case when v = 100 then 'OK' else 'FAIL' end || E' 11c vastgelegde status blijft gelijk (bepaald vóór de start)\n';

  -- 7. Teamgame: elke underdog in het winnende team krijgt de bonus
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g_team) returning id into m2;
  insert into public.match_players (match_id, user_id) values (m2, ua), (m2, ub), (m2, uc), (m2, ud), (m2, ue), (m2, uf);
  update public.match_players set team = case when user_id in (uc, ue, uf) then 'Rood' else 'Blauw' end where match_id = m2;
  perform public.save_team_score(m2, 'Rood', 1, 'set', 30, 0, gen_random_uuid());
  perform public.save_team_score(m2, 'Blauw', 1, 'set', 10, 0, gen_random_uuid());
  perform public.finalize_teams_match(m2);
  reset role;
  select string_agg(user_id::text || ':' || underdog_bonus, ',') into t from public.match_results where match_id = m2 and underdog_bonus > 0;
  select count(*) filter (where underdog_bonus = 2), count(*) filter (where is_winner) into v, v2 from public.match_results where match_id = m2;
  select underdog_bonus into cnt from public.match_results where match_id = m2 and user_id = uc;
  rep := rep || case when v = 2 and v2 = 3 and cnt = 0 then 'OK' else 'FAIL' end
             || format(E' 7 teamgame: winnend team (C, E, F), alleen de underdogs E en F krijgen +2 [%s bonussen, %s winnaars]\n', v, v2);
  -- 6. Meerdere winnaars: elke underdog afzonderlijk
  select count(distinct actor_id) into cnt from public.activity where type = 'underdog_win' and match_id = m2;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || format(E' 6 meerdere winnaars: E en F elk één keer de bonus [%s]\n', cnt);

  -- Verborgen rollen: niets zichtbaar vóór de officiële uitslag; daarna alleen de winnende underdog
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g_role) returning id into m3;
  insert into public.match_players (match_id, user_id) values (m3, ua), (m3, ud), (m3, ue), (m3, uf);
  select count(*) into cnt from public.match_results where match_id = m3;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 7b rollen: vóór de uitslag geen bonus zichtbaar\n';
  perform public.finalize_team_match(m3, 'Wolven', jsonb_build_object(ua, 'Dorp', ud, 'Wolven', ue, 'Dorp', uf, 'Wolven'));
  reset role;
  select count(*) filter (where underdog_bonus > 0), max(league_points) filter (where user_id = uf) into v, v2 from public.match_results where match_id = m3;
  -- F stond op het moment van de start mogelijk niet meer onderaan; de vastgelegde status beslist
  select count(*) into cnt from public.match_underdogs where match_id = m3 and user_id = uf;
  rep := rep || case when (cnt = 1 and v = 1 and v2 = 14) or (cnt = 0 and v = 0 and v2 = 12) then 'OK' else 'FAIL' end
             || format(E' 7c rollen: bonus alleen voor een underdog in het winnende team [status F %s, bonussen %s, F %s punten]\n', cnt, v, v2);

  -- 6b. Gelijkspel in een solo-spel (gedeelde 1e plek): bestaande regel = geen winnaar, dus geen bonus
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g_solo) returning id into m4;
  insert into public.match_players (match_id, user_id) values (m4, ua), (m4, ue), (m4, uf);
  perform public.save_score(m4, ue, 1, 'set', 10, 0, gen_random_uuid());
  perform public.save_score(m4, uf, 1, 'set', 10, 0, gen_random_uuid());
  perform public.finalize_match(m4);
  reset role;
  select count(*) filter (where is_winner), coalesce(sum(underdog_bonus), 0) into v, v2 from public.match_results where match_id = m4;
  rep := rep || case when v = 0 and v2 = 0 then 'OK' else 'FAIL' end || format(E' 6b gedeelde 1e plek (geen winnaar volgens de bestaande regels): geen bonus [%s, %s]\n', v, v2);

  -- Speler moet echt meedoen: weggehaald = geen bonus
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n1, g_solo) returning id into m5;
  insert into public.match_players (match_id, user_id) values (m5, ua), (m5, uc), (m5, ue), (m5, uf);
  -- [lokaal]
  delete from public.match_players where match_id = m5 and user_id = uf;
  -- [/lokaal]
  reset role;
  -- [lokaal]
  select count(*) into cnt from public.match_results where match_id = m5;
  rep := rep || case when cnt = 0 and not exists (select 1 from public.match_players where match_id = m5 and user_id = uf) then 'OK' else 'FAIL' end
             || E' 4d F weggehaald uit het potje: doet niet mee, kan geen bonus krijgen\n';

  -- 12. Verwijderd potje: bonus verdwijnt mee
  select points into v from public.overall_leaderboard where user_id = uf;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.reopen_match(m2);
  delete from public.matches where id = m2;
  reset role;
  select points into v2 from public.overall_leaderboard where user_id = uf;
  select count(*) into cnt from public.match_underdogs where match_id = m2;
  rep := rep || case when v - v2 = 12 and cnt = 0 and not exists (select 1 from public.activity where match_id = m2) then 'OK' else 'FAIL' end
             || format(E' 12 verwijderd teampotje: F verliest 10 + 2, status en nieuws weg [%s → %s]\n', v, v2);
  -- [/lokaal]

  -- XP: wordt berekend uit plaats en winst, niet uit competitiepunten (src/lib/xp.ts) → onveranderd
  select count(*) into cnt from public.match_results where match_id = m1 and is_winner and placement = 1 and user_id = uf;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' X plaats en winst (basis voor XP) ongewijzigd\n';

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
