-- My Attendance: afmeldingen bewaren en aanwezigheid door de host.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid. Het rapport staat in de foutmelding.
do $test$
declare
  rep text := E'\n';
  code text;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid();
  n1 uuid; n2 uuid; cnt int; ok boolean;
begin
  select value into code from public.app_settings where key = 'invite_code';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_at_' || u.n || '@test.invalid',
         jsonb_build_object('username', 'ZzAt' || u.n, 'invite_code', code), now(), now()
    from (values (ua, 'A'), (ub, 'B'), (uc, 'C'), (ud, 'D')) u(id, n);
  insert into public.game_nights (title, starts_at, host_id, created_by) values ('ZzAtGepland', now() + interval '1 day', ua, ua) returning id into n1;
  insert into public.game_nights (title, starts_at, host_id, created_by, status) values ('ZzAtKlaar', now() - interval '1 day', ua, ua, 'finished') returning id into n2;
  update public.game_nights set cohost_id = ub where id in (n1, n2);

  -- C meldt zich af voor de geplande avond
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  set local role authenticated;
  insert into public.night_declines (night_id, user_id) values (n1, uc);
  insert into public.night_declines (night_id, user_id) values (n1, uc) on conflict do nothing;
  select count(*) into cnt from public.night_declines where night_id = n1 and user_id = uc;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || format(E' A1 afmelding bewaard, nooit dubbel [%s]\n', cnt);
  begin
    insert into public.night_declines (night_id, user_id) values (n1, ud);
    rep := rep || E'FAIL A2 speler kon iemand anders afmelden\n';
  exception when others then rep := rep || E'OK A2 je kunt alleen jezelf afmelden\n';
  end;
  begin
    insert into public.night_declines (night_id, user_id) values (n2, uc);
    rep := rep || E'FAIL A3 afmelden voor een afgelopen avond toegestaan\n';
  exception when others then rep := rep || E'OK A3 achteraf afmelden kan niet (geen geschiedenis herschrijven)\n';
  end;
  -- Toch aanmelden: aanmelding bestaat naast de oude afmelding; de aanmelding telt
  insert into public.participants (night_id, user_id) values (n1, uc);
  select count(*) into cnt from public.participants where night_id = n1 and user_id = uc;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' A4 na afmelden toch aanmelden kan\n';
  -- Gewone speler kan geen aanwezigheid zetten
  begin
    perform public.set_attendance(n2, uc, true);
    rep := rep || E'FAIL A5 speler kon zichzelf aanwezig zetten\n';
  exception when others then rep := rep || E'OK A5 speler kan zichzelf niet aanwezig zetten\n';
  end;
  begin
    insert into public.night_attendance (night_id, user_id, present) values (n2, uc, true);
    rep := rep || E'FAIL A6 speler kon rechtstreeks aanwezigheid schrijven\n';
  exception when others then rep := rep || E'OK A6 aanwezigheid alleen via de host-functie\n';
  end;
  reset role;

  -- Host zet D aanwezig op de afgelopen avond (twee keer: één rij)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.set_attendance(n2, ud, true);
  perform public.set_attendance(n2, ud, true);
  reset role;
  select count(*) into cnt from public.night_attendance where night_id = n2 and user_id = ud and present;
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' A7 host zet aanwezig; dubbel tikken = één registratie\n';

  -- Co-host zet het terug (automatisch)
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  perform public.set_attendance(n2, ud, false);
  begin
    perform public.set_attendance(n1, ud, true);
    rep := rep || E'FAIL A8 aanwezigheid op een geplande avond toegestaan\n';
  exception when others then rep := rep || E'OK A8 aanwezigheid pas tijdens/na de avond\n';
  end;
  reset role;
  select (not present and set_by = ub) into ok from public.night_attendance where night_id = n2 and user_id = ud;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' A9 co-host zet terug op automatisch\n';

  -- Bestaande XP/records/banners lezen participants: die zijn niet aangepast door afmelden/aanwezigheid
  select count(*) into cnt from public.participants where night_id = n2;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || format(E' A10 deelnemerslijst ongewijzigd (host + co-host) [%s]\n', cnt);

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
