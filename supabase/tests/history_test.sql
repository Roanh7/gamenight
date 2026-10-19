-- Historische seizoenen beschermen: correcties en verwijderingen in afgesloten seizoenen.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid. Het rapport staat in de foutmelding.
-- Stukken tussen [lokaal] en [/lokaal] draaien alleen in de lokale testdatabase.
do $test$
declare
  rep text := E'\n';
  code text;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  g1 uuid; n_old uuid; n_new uuid; n_pr uuid; m_old uuid; m_new uuid; m_pr uuid; m_old2 uuid;
  t_orig timestamptz; t_now timestamptz; cnt int; v int; ok boolean; s text;
begin
  select value into code from public.app_settings where key = 'invite_code';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_hi_' || u.n || '@test.invalid',
         jsonb_build_object('username', 'ZzHi' || u.n, 'invite_code', code), now(), now()
    from (values (ua, 'A'), (ub, 'B'), (uc, 'C')) u(id, n);
  insert into public.games (name, created_by) values ('ZzHiSolo', ua) returning id into g1;

  -- Drie avonden: een oude (vorig jaar), een nieuwe (nu) en een oude oefenavond
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzHiOud', now(), ua, ua, 'live') returning id into n_old;
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzHiNu', now(), ua, ua, 'live') returning id into n_new;
  insert into public.game_nights (title, starts_at, host_id, created_by, status, is_practice) values ('ZzHiOefen', now(), ua, ua, 'live', true) returning id into n_pr;
  update public.game_nights set cohost_id = ub where id in (n_old, n_new, n_pr);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n_old, g1) returning id into m_old;
  insert into public.matches (night_id, game_id) values (n_old, g1) returning id into m_old2;
  insert into public.matches (night_id, game_id) values (n_new, g1) returning id into m_new;
  insert into public.matches (night_id, game_id) values (n_pr, g1) returning id into m_pr;
  insert into public.match_players (match_id, user_id)
  select m, u from unnest(array[m_old, m_old2, m_new, m_pr]) m, unnest(array[ua, ub, uc]) u;
  perform public.save_score(m_old, ua, 1, 'set', 30, 0, gen_random_uuid());
  perform public.save_score(m_old, ub, 1, 'set', 20, 0, gen_random_uuid());
  perform public.save_score(m_old2, ua, 1, 'set', 5, 0, gen_random_uuid());
  perform public.save_score(m_new, ub, 1, 'set', 9, 0, gen_random_uuid());
  perform public.save_score(m_pr, uc, 1, 'set', 9, 0, gen_random_uuid());
  perform public.finalize_match(m_old);
  perform public.finalize_match(m_old2);
  perform public.finalize_match(m_new);
  perform public.finalize_match(m_pr);
  perform public.finish_night(n_old);
  reset role;
  -- De oude avond en oefenavond naar vorig jaar verplaatsen (zoals echte oude data)
  update public.matches set finished_at = finished_at - interval '1 year' where id in (m_old, m_old2, m_pr);
  select finished_at into t_orig from public.matches where id = m_old;
  select count(*) into cnt from public.night_ceremonies where night_id = n_old;

  -- H1. Correctie in het HUIDIGE seizoen: gewoon zoals altijd, en het potje houdt zijn moment
  select finished_at into t_now from public.matches where id = m_new;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.reopen_match(m_new);
  perform public.finalize_match(m_new);
  reset role;
  select (finished_at = t_now and original_finished_at = t_now) into ok from public.matches where id = m_new;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' H1 huidig seizoen: co-host corrigeert zonder extra vraag, moment blijft gelijk\n';

  -- H2. Oud potje heropenen zonder bevestiging: geweigerd, uitslag blijft staan
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    perform public.reopen_match(m_old);
    rep := rep || E'FAIL H2 oud potje kon zonder bevestiging worden heropend\n';
  exception when others then
    rep := rep || case when sqlerrm like 'HISTORISCH%' then 'OK' else 'FAIL' end || E' H2 oud potje heropenen zonder bevestiging: geweigerd\n';
  end;
  reset role;
  select count(*) into cnt from public.match_results where match_id = m_old;
  rep := rep || case when cnt = 3 then 'OK' else 'FAIL' end || format(E' H2b uitslag van het oude seizoen is intact [%s]\n', cnt);

  -- H3. Gewone speler kan geen toestemming krijgen
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    perform public.allow_history_change(m_old, 'match');
    rep := rep || E'FAIL H3 gewone speler kreeg toestemming\n';
  exception when others then rep := rep || E'OK H3 gewone speler krijgt geen toestemming\n';
  end;
  begin
    perform public.allow_history_change(n_old, 'night');
    rep := rep || E'FAIL H3b gewone speler kreeg toestemming voor de avond\n';
  exception when others then rep := rep || E'OK H3b ook niet voor een avond\n';
  end;
  reset role;

  -- H4. Host bevestigt → heropenen mag, nieuwsbericht, oorspronkelijk moment onthouden
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.allow_history_change(m_old, 'match');
  perform public.reopen_match(m_old);
  reset role;
  select (status = 'live' and finished_at is null and original_finished_at = t_orig) into ok from public.matches where id = m_old;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' H4 met bevestiging heropend; oorspronkelijk moment bewaard\n';
  select count(*) into cnt from public.activity where type = 'history_correction' and payload ->> 'action' = 'match_reopened' and actor_id = ua;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' H4b nieuwsbericht "seizoenscorrectie"\n';

  -- H5. Corrigeren en opnieuw afronden → terug in het OUDE seizoen, niet in het huidige
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.save_score(m_old, ub, 1, 'add', 50, null, gen_random_uuid());
  perform public.finalize_match(m_old);
  reset role;
  select (finished_at = t_orig and private.is_past_season(finished_at)) into ok from public.matches where id = m_old;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' H5 na correctie staat het potje weer in het oude seizoen\n';
  select (winner_id = ub) into ok from public.matches where id = m_old;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' H5b gecorrigeerde winnaar (B) telt\n';
  select count(*) into cnt from public.match_results mr join public.matches m on m.id = mr.match_id
   where mr.user_id in (ua, ub, uc) and private.season_key(m.finished_at) = private.season_key(now());
  rep := rep || case when cnt = 3 then 'OK' else 'FAIL' end || format(E' H5c huidig seizoen: alleen het nieuwe potje (3 uitslagen) [%s]\n', cnt);
  select count(*) into cnt from public.night_ceremonies where night_id = n_old;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' H5d geen extra Podium Ceremony door de correctie\n';
  select count(*) into cnt from public.activity where night_id = n_old and type = 'night_recap';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' H5e recap van de oude avond bijgewerkt\n';

  -- H6. Verlopen toestemming telt niet meer
  update private.history_overrides set expires_at = now() - interval '1 minute' where target_id = m_old;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    perform public.reopen_match(m_old);
    rep := rep || E'FAIL H6 verlopen toestemming werkte nog\n';
  exception when others then rep := rep || E'OK H6 verlopen toestemming (na 5 minuten) werkt niet meer\n';
  end;
  reset role;

  -- H7. Oefenavond van vorig jaar: niet beschermd (telt nergens mee)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.reopen_match(m_pr);
  reset role;
  select (status = 'live') into ok from public.matches where id = m_pr;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' H7 oefenavond: gewoon te corrigeren\n';

  -- H8. Underdog-bonus blijft werken bij een historische correctie
  insert into public.match_underdogs (match_id, user_id, season, rank, points, ref_points, threshold, bonus)
  values (m_old2, uc, private.season_key(t_orig), 3, 0, 20, 10, 2);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.allow_history_change(m_old2, 'match');
  perform public.reopen_match(m_old2);
  perform public.save_score(m_old2, uc, 1, 'set', 40, 0, gen_random_uuid());
  perform public.finalize_match(m_old2);
  reset role;
  select league_points, underdog_bonus into v, cnt from public.match_results where match_id = m_old2 and user_id = uc;
  select private.is_past_season(finished_at) into ok from public.matches where id = m_old2;
  rep := rep || case when v = 12 and cnt = 2 and ok then 'OK' else 'FAIL' end || format(E' H8 underdog wint na correctie: 10 + 2, in het oude seizoen [%s, %s]\n', v, cnt);

  -- H9. Oude avond verwijderen zonder bevestiging: geweigerd, alles blijft
  -- [lokaal]
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    delete from public.game_nights where id = n_old;
    rep := rep || E'FAIL H9 oude avond kon zonder bevestiging weg\n';
  exception when others then
    rep := rep || case when sqlerrm like 'HISTORISCH%' then 'OK' else 'FAIL' end || E' H9 oude avond verwijderen zonder bevestiging: geweigerd\n';
  end;
  reset role;
  select count(*) into cnt from public.match_results where match_id in (m_old, m_old2);
  rep := rep || case when cnt = 6 then 'OK' else 'FAIL' end || format(E' H9b uitslagen intact [%s]\n', cnt);

  -- H10. Nieuwe avond (huidig seizoen) verwijderen: werkt zoals altijd
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  delete from public.game_nights where id = n_new;
  reset role;
  select count(*) into cnt from public.game_nights where id = n_new;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' H10 avond uit het huidige seizoen: verwijderen zoals altijd\n';

  -- H11. Heropend oud potje weggooien: eerst bevestigen
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.allow_history_change(m_old2, 'match');
  perform public.reopen_match(m_old2);
  reset role;
  update private.history_overrides set expires_at = now() - interval '1 minute' where target_id = m_old2;
  set local role authenticated;
  begin
    delete from public.matches where id = m_old2;
    get diagnostics cnt = row_count;
    rep := rep || E'FAIL H11 heropend oud potje kon zonder bevestiging weg\n';
  exception when others then rep := rep || E'OK H11 heropend oud potje weggooien zonder bevestiging: geweigerd\n';
  end;
  perform public.allow_history_change(m_old2, 'match');
  delete from public.matches where id = m_old2;
  reset role;
  select count(*) into cnt from public.matches where id = m_old2;
  select count(*) into v from public.activity where type = 'history_correction' and payload ->> 'action' = 'match_removed';
  rep := rep || case when cnt = 0 and v = 1 then 'OK' else 'FAIL' end || E' H11b met bevestiging weggegooid + nieuwsbericht\n';

  -- H12. Oude avond met bevestiging verwijderen: weg, met nieuwsbericht welke seizoenen
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.allow_history_change(n_old, 'night');
  delete from public.game_nights where id = n_old;
  reset role;
  select count(*) into cnt from public.match_results where match_id = m_old;
  select payload ->> 'seasons' into s from public.activity where type = 'history_correction' and payload ->> 'action' = 'night_removed';
  rep := rep || case when cnt = 0 and s like '%' || private.season_key(t_orig) || '%' then 'OK' else 'FAIL' end
             || format(E' H12 met bevestiging verwijderd; nieuws noemt het seizoen [%s]\n', s);
  -- [/lokaal]

  -- H13. Spelers kunnen de toestemmingen niet zien of maken
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin
    perform count(*) from private.history_overrides;
    rep := rep || E'FAIL H13 speler kan toestemmingen lezen\n';
  exception when others then rep := rep || E'OK H13 toestemmingen zijn afgeschermd\n';
  end;
  reset role;

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
