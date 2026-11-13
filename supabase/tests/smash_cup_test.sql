-- 🏆 Smash Bros Championship Cup: test op de echte database.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid. Het rapport staat in de foutmelding.
do $test$
declare
  rep text := E'\n';
  code text;
  rahim uuid := 'a4b8ef16-179f-4601-b404-ca51a6ac5ca7';
  admin uuid := '01e07e13-e67f-4d8a-8536-3a2d06efe4ac';
  smash uuid;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  n0 uuid; n1 uuid; n2 uuid; n3 uuid; n4 uuid; m uuid;
  cnt int; cnt2 int; res jsonb; champ uuid; results_before int;
begin
  select g.id into smash from public.games g where g.name ilike '%smash%' order by g.created_at limit 1;
  select value into code from public.app_settings where key = 'invite_code';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_cup_' || u.n || '@test.invalid',
         jsonb_build_object('username', 'ZzCup' || u.n, 'invite_code', code), now(), now()
    from (values (ua, 'A'), (ub, 'B'), (uc, 'C')) u(id, n);

  -- 1. Startsituatie
  rep := rep || case when public.smash_champion() = rahim then 'OK' else 'FAIL' end || E' 1 Rahim is de regerend kampioen\n';

  -- Avonden: n0 normaal, n1 Cup gepland, n2 + n3 Cup bezig, n4 oefen-Cup
  insert into public.game_nights (title, starts_at, host_id, created_by, status, smash_cup) values ('ZzNormaal', now(), ua, ua, 'live', false) returning id into n0;
  insert into public.game_nights (title, starts_at, host_id, created_by, status, smash_cup) values ('ZzCupGepland', now() + interval '7 days', ua, ua, 'planned', true) returning id into n1;
  insert into public.game_nights (title, starts_at, host_id, created_by, status, smash_cup) values ('ZzCup1', now(), ua, ua, 'live', true) returning id into n2;
  insert into public.game_nights (title, starts_at, host_id, created_by, status, smash_cup) values ('ZzCup2', now(), ua, ua, 'live', true) returning id into n3;
  insert into public.game_nights (title, starts_at, host_id, created_by, status, smash_cup, is_practice) values ('ZzOefenCup', now(), ua, ua, 'live', true, true) returning id into n4;

  -- Als host (ua) een Smash-potje spelen op n0 en n2 (n3 komt later)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  foreach m in array array[n0, n2, n4] loop
    declare mid uuid;
    begin
      insert into public.matches (night_id, game_id) values (m, smash) returning id into mid;
      insert into public.match_players (match_id, user_id) values (mid, ua), (mid, ub);
      perform public.save_score(mid, ua, 1, 'set', 30, 0, gen_random_uuid());
      perform public.save_score(mid, ub, 1, 'set', 10, 0, gen_random_uuid());
      perform public.finalize_match(mid);
    end;
  end loop;
  select count(*) into results_before from public.match_results;

  -- 2. Normaal Smash-potje: geen beker
  begin perform public.confirm_smash_cup(n0, ua); rep := rep || E'FAIL 2 normale avond gaf een beker\n';
  exception when others then rep := rep || E'OK 2 normale Smash-avond geeft geen beker\n'; end;
  -- 3. Geplande Cup
  begin perform public.confirm_smash_cup(n1, ua); rep := rep || E'FAIL 3 geplande Cup gaf een beker\n';
  exception when others then rep := rep || E'OK 3 geplande Cup verandert niets\n'; end;
  -- 4. Cup bezig maar nog geen Smash-potje af
  begin perform public.confirm_smash_cup(n3, ua); rep := rep || E'FAIL 4 Cup zonder afgerond potje gaf een beker\n';
  exception when others then rep := rep || E'OK 4 zonder afgerond Smash-potje geen beker\n'; end;
  -- 5. Oefen-Cup
  begin perform public.confirm_smash_cup(n4, ua); rep := rep || E'FAIL 5 oefenavond gaf een beker\n';
  exception when others then rep := rep || E'OK 5 oefenavond geeft geen beker\n'; end;
  reset role;

  -- 6. Gewone speler (uc) mag niet bevestigen, en niemand mag direct in de tabel schrijven
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  begin perform public.confirm_smash_cup(n2, uc); rep := rep || E'FAIL 6 gewone speler kon bevestigen\n';
  exception when others then rep := rep || E'OK 6 gewone speler kan niet bevestigen\n'; end;
  begin insert into public.smash_cups (held_on, winner_id) values (current_date, uc); rep := rep || E'FAIL 6b direct invoegen lukte\n';
  exception when others then rep := rep || E'OK 6b direct invoegen kan niet\n'; end;
  begin perform public.add_historic_smash_cup(date '2024-12-30', uc, null); rep := rep || E'FAIL 6c niet-beheerder kon historie toevoegen\n';
  exception when others then rep := rep || E'OK 6c historie toevoegen alleen voor beheerder\n'; end;
  reset role;

  -- 7. Host bevestigt ub (nieuwe kampioen)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  res := public.confirm_smash_cup(n2, ub);
  reset role;
  rep := rep || case when public.smash_champion() = ub and (res->>'defended')::boolean = false and (res->>'previous')::uuid = rahim then 'OK' else 'FAIL ' || res::text end
             || E' 7 nieuwe kampioen, beker van Rahim overgenomen\n';
  select count(*) into cnt from public.activity where night_id = n2 and type = 'smash_champion';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 7b één nieuwsbericht\n';

  -- 8. Nog een keer bevestigen: geen dubbele registratie of extra nieuws
  set local role authenticated;
  res := public.confirm_smash_cup(n2, ub);
  reset role;
  select count(*) into cnt from public.smash_cups where night_id = n2;
  select count(*) into cnt2 from public.activity where night_id = n2 and type = 'smash_champion';
  rep := rep || case when cnt = 1 and cnt2 = 1 and (res->>'changed')::boolean = false then 'OK' else 'FAIL' end || E' 8 opnieuw bevestigen: niets dubbel\n';

  -- 9. Avond afsluiten verandert de kampioen niet
  update public.game_nights set status = 'finished' where id = n2;
  rep := rep || case when public.smash_champion() = ub then 'OK' else 'FAIL' end || E' 9 afsluiten houdt de kampioen\n';

  -- 10. Tweede Cup: ub wint weer = titelverdediging
  set local role authenticated;
  insert into public.matches (night_id, game_id) values (n3, smash) returning id into m;
  insert into public.match_players (match_id, user_id) values (m, ua), (m, ub);
  perform public.save_score(m, ub, 1, 'set', 30, 0, gen_random_uuid());
  perform public.save_score(m, ua, 1, 'set', 10, 0, gen_random_uuid());
  perform public.finalize_match(m);
  select count(*) into results_before from public.match_results;
  res := public.confirm_smash_cup(n3, ub);
  reset role;
  rep := rep || case when (res->>'defended')::boolean and (res->>'cups')::int = 2 and public.smash_champion() = ub then 'OK' else 'FAIL ' || res::text end
             || E' 10 titelverdediging herkend (2 bekers)\n';

  -- 11. Geen invloed op uitslagen/punten
  select count(*) into cnt from public.match_results;
  rep := rep || case when cnt = results_before then 'OK' else 'FAIL' end || E' 11 bevestigen maakt geen uitslagen of punten aan\n';

  -- 12. Correctie: n3 toch gewonnen door ua → ua kampioen, nog steeds één rij
  set local role authenticated;
  res := public.confirm_smash_cup(n3, ua);
  reset role;
  select count(*) into cnt from public.smash_cups where night_id = n3;
  rep := rep || case when public.smash_champion() = ua and cnt = 1 then 'OK' else 'FAIL' end || E' 12 correctie zonder dubbele rij\n';

  -- 13. Cup n3 afgelast → beker terug naar ub
  update public.game_nights set status = 'cancelled' where id = n3;
  rep := rep || case when public.smash_champion() = ub then 'OK' else 'FAIL' end || E' 13 afgelaste Cup telt niet meer\n';

  -- 14. Cup uitgezet op n2 → beker terug naar Rahim; historie blijft
  update public.game_nights set smash_cup = false where id = n2;
  select count(*) into cnt from public.smash_cups where is_historic and winner_id = rahim and held_on = date '2025-12-30' and removed_at is null;
  rep := rep || case when public.smash_champion() = rahim and cnt = 1 then 'OK' else 'FAIL' end || E' 14 Cup uit: Rahim weer kampioen, historie bewaard\n';

  -- 15. Beheerder: historie toevoegen (geen toekomst)
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', admin::text, true);
  set local role authenticated;
  perform public.add_historic_smash_cup(date '2024-12-28', uc, 'test');
  begin perform public.add_historic_smash_cup(current_date + 3, uc, null); rep := rep || E'FAIL 15b toekomstige datum geaccepteerd\n';
  exception when others then rep := rep || E'OK 15b geen datum in de toekomst\n'; end;
  reset role;
  rep := rep || case when public.smash_champion() = rahim then 'OK' else 'FAIL' end || E' 15 oudere historie verandert de huidige kampioen niet\n';

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
