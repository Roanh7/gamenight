-- Test profielbanners: alleen de server kent banners toe, je kunt alleen een vrijgespeelde kiezen,
-- geen dubbele vrijgave of dubbel nieuws, intrekken na correctie.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
do $test$
declare
  rep text := E'\n';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  code text; sec text; cnt int; t text; ok boolean; res jsonb; act0 int;
  grant_inferno jsonb;
  grant_royal jsonb;
begin
  select value into code from public.app_settings where key = 'invite_code';
  select value into sec from private.secrets where key = 'push';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_ba@test.invalid', jsonb_build_object('username','ZzBanA','invite_code',code), now(), now()),
   (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_bb@test.invalid', jsonb_build_object('username','ZzBanB','invite_code',code), now(), now());
  select count(*) into act0 from public.activity where type = 'banner_unlocked';
  grant_inferno := jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'inferno', 'announce', false, 'name', 'Inferno', 'rarity', 'rare', 'emoji', '🔥'));
  grant_royal := jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'royal-champion', 'announce', true, 'name', 'Royal Champion', 'rarity', 'legendary', 'emoji', '👑'));

  select banner into t from public.profiles where id = ua;
  rep := rep || case when t = 'rookie-fields' then 'OK' else 'FAIL' end || E' 1 nieuwe speler heeft Rookie Fields\n';

  -- Speler A probeert het zelf via de browser
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;

  ok := false;
  begin insert into public.banner_unlocks (user_id, banner_id) values (ua, 'hall-of-fame'); exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 2 zelf een banner vrijspelen via de browser kan niet\n';

  ok := false;
  begin update public.profiles set banner = 'hall-of-fame' where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 3 vergrendelde banner kiezen kan niet\n';

  ok := false;
  begin perform public.sync_banners('fout-geheim', grant_inferno, null); exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 4 vrijgeven zonder het juiste geheim kan niet\n';

  -- Server geeft Inferno (geen nieuws) en Royal Champion (wel nieuws)
  res := public.sync_banners(sec, grant_inferno || grant_royal, null);
  rep := rep || case when (res ->> 'added')::int = 2 then 'OK' else 'FAIL' end || ' 5 server geeft 2 banners tegelijk: ' || res::text || E'\n';
  res := public.sync_banners(sec, grant_inferno || grant_royal, null);
  select count(*) into cnt from public.banner_unlocks where user_id = ua;
  rep := rep || case when cnt = 2 and (res ->> 'added')::int = 0 then 'OK' else 'FAIL' end || E' 6 nog eens vrijgeven geeft geen dubbele banners\n';
  select count(*) - act0 into cnt from public.activity where type = 'banner_unlocked';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || ' 7 precies één nieuwsbericht (alleen Royal Champion): ' || cnt || E'\n';

  update public.profiles set banner = 'inferno' where id = ua;
  select banner into t from public.profiles where id = ua;
  rep := rep || case when t = 'inferno' then 'OK' else 'FAIL' end || E' 8 vrijgespeelde banner kiezen werkt\n';
  update public.profiles set banner = 'rookie-fields' where id = ua;
  update public.profiles set banner = 'inferno', bio = 'test' where id = ua;
  rep := rep || E'OK 8b terug naar Rookie Fields en weer wisselen werkt\n';

  -- B mag A's banner niet wijzigen
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  update public.profiles set banner = 'rookie-fields' where id = ua;
  reset role;
  select banner into t from public.profiles where id = ua;
  rep := rep || case when t = 'inferno' then 'OK' else 'FAIL' end || E' 9 een vriend kan jouw banner niet wijzigen\n';

  -- Gezien markeren: alleen je eigen banners
  set local role authenticated;
  perform public.mark_banners_seen(array['inferno', 'royal-champion']);
  reset role;
  select count(*) into cnt from public.banner_unlocks where user_id = ua and seen;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 10 iemand anders kan jouw unlock-melding niet wegklikken\n';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  perform public.mark_banners_seen(array['inferno', 'royal-champion']);
  ok := false;
  begin update public.banner_unlocks set revoked_at = null, seen = false where user_id = ua; get diagnostics cnt = row_count; ok := cnt = 0; exception when others then ok := true; end;
  reset role;
  select count(*) into cnt from public.banner_unlocks where user_id = ua and seen;
  rep := rep || case when cnt = 2 then 'OK' else 'FAIL' end || E' 11 eigen unlock-melding wegklikken werkt (geen herhaling na herladen)\n';
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 11b zelf unlocks aanpassen via de browser kan niet\n';

  -- Correctie: Inferno klopt niet meer → ingetrokken, kiezen kan niet meer
  res := public.sync_banners(sec, null, jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'inferno')));
  select count(*) into cnt from public.banner_unlocks where user_id = ua and banner_id = 'inferno' and revoked_at is not null;
  rep := rep || case when cnt = 1 and (res ->> 'revoked')::int = 1 then 'OK' else 'FAIL' end || E' 12 na correctie wordt een onterechte banner ingetrokken\n';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set banner = 'rookie-fields' where id = ua;
  ok := false;
  begin update public.profiles set banner = 'inferno' where id = ua; exception when others then ok := true; end;
  reset role;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 13 ingetrokken banner kun je niet meer kiezen\n';

  -- Weer verdiend (na opnieuw afronden): stil terug, geen nieuwe melding of nieuws
  res := public.sync_banners(sec, grant_inferno || grant_royal, null);
  select count(*) into cnt from public.banner_unlocks where user_id = ua and banner_id = 'inferno' and revoked_at is null and seen;
  rep := rep || case when cnt = 1 and (res ->> 'restored')::int = 1 then 'OK' else 'FAIL' end || E' 14 weer verdiend: stil terug, geen tweede animatie\n';
  select count(*) - act0 into cnt from public.activity where type = 'banner_unlocked';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 15 nog steeds maar één nieuwsbericht\n';

  raise exception 'TESTRAPPORT (alles teruggedraaid):%', rep;
end
$test$;
