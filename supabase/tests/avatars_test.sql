-- Test Ultimate Avatar System: pixel-avatar opslaan, alleen je eigen avatar, frames alleen als je ze hebt
-- (ook niet via een nagemaakt verzoek), terugvallen na intrekken, emoji blijft bewaard, niets anders verandert.
-- Eindigt ALTIJD met een exception, zodat alles wordt teruggedraaid.
do $test$
declare
  rep text := E'\n';
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  code text; sec text; t text; e text; j jsonb; ok boolean; res jsonb; act0 int; cnt int;
  pix jsonb := '{"v":1,"k":"pixel","skin":"s3","face":"oval","hair":"curly","hairColor":"red","outfit":"hoodie","bg":"teal"}';
  g_inf jsonb;
begin
  select value into code from public.app_settings where key = 'invite_code';
  select value into sec from private.secrets where key = 'push';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
   (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_av_a@test.invalid', jsonb_build_object('username','ZzAvA','invite_code',code), now(), now()),
   (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz_av_b@test.invalid', jsonb_build_object('username','ZzAvB','invite_code',code), now(), now());
  select count(*) into act0 from public.activity;
  g_inf := jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'frame-inferno', 'announce', false, 'name', 'Inferno', 'rarity', 'rare', 'emoji', '🔥'));

  select avatar_frame, avatar_pixel into t, j from public.profiles where id = ua;
  rep := rep || case when t = 'none' and j is null then 'OK' else 'FAIL' end || E' 1 nieuwe speler: geen frame, geen pixel-avatar (emoji/letter zoals altijd)\n';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;

  update public.profiles set avatar_emoji = '🐸' where id = ua;
  update public.profiles set avatar_pixel = pix where id = ua;
  select avatar_pixel ->> 'hair', avatar_emoji into t, e from public.profiles where id = ua;
  rep := rep || case when t = 'curly' and e = '🐸' then 'OK' else 'FAIL' end || E' 2 pixel-avatar opslaan; emoji blijft bewaard\n';

  update public.profiles set avatar_pixel = '{"v":1,"k":"preset","id":"shadow-ninja"}' where id = ua;
  select avatar_pixel ->> 'id' into t from public.profiles where id = ua;
  rep := rep || case when t = 'shadow-ninja' then 'OK' else 'FAIL' end || E' 3 kant-en-klaar personage kiezen\n';

  ok := false;
  begin update public.profiles set avatar_pixel = '"<script>"' where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 4 rommel (geen object) wordt geweigerd\n';
  ok := false;
  begin update public.profiles set avatar_pixel = '{"k":"hack"}' where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 5 onbekende soort wordt geweigerd\n';
  ok := false;
  begin update public.profiles set avatar_pixel = jsonb_build_object('k', 'pixel', 'x', repeat('a', 3000)) where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 6 te grote avatar wordt geweigerd\n';

  update public.profiles set avatar_frame = 'blue' where id = ua;
  select avatar_frame into t from public.profiles where id = ua;
  rep := rep || case when t = 'blue' then 'OK' else 'FAIL' end || E' 7 gratis frame (Blue Pixel) kiezen kan meteen\n';

  ok := false;
  begin update public.profiles set avatar_frame = 'inferno' where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 8 vergrendeld frame kiezen kan niet (ook niet via een nagemaakt verzoek)\n';
  ok := false;
  begin update public.profiles set avatar_frame = 'golden-hack' where id = ua; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 9 onbekend frame kan niet\n';
  ok := false;
  begin insert into public.banner_unlocks (user_id, banner_id) values (ua, 'frame-inferno'); exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 10 zelf een frame vrijspelen via de browser kan niet\n';

  -- Server speelt Inferno vrij (geen nieuwsbericht)
  reset role;
  res := public.sync_banners(sec, g_inf, null);
  res := public.sync_banners(sec, g_inf, null);
  select count(*) into cnt from public.banner_unlocks where user_id = ua and banner_id = 'frame-inferno';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 11 frame vrijgeven (twee keer) geeft precies één rij\n';
  select count(*) - act0 into cnt from public.activity;
  rep := rep || case when cnt = 0 then 'OK' else 'FAIL' end || E' 12 frames geven geen nieuwsbericht (oude app blijft netjes)\n';

  set local role authenticated;
  update public.profiles set avatar_frame = 'inferno' where id = ua;
  select avatar_frame into t from public.profiles where id = ua;
  rep := rep || case when t = 'inferno' then 'OK' else 'FAIL' end || E' 13 vrijgespeeld frame dragen werkt\n';
  update public.profiles set bio = 'hoi' where id = ua;
  rep := rep || E'OK 13b andere profielwijziging met een frame aan werkt\n';

  -- Speler B mag A niet aanpassen
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  update public.profiles set avatar_pixel = null, avatar_frame = 'none', avatar_emoji = null where id = ua;
  select avatar_frame, avatar_pixel ->> 'id' into t, e from public.profiles where id = ua;
  rep := rep || case when t = 'inferno' and e = 'shadow-ninja' then 'OK' else 'FAIL' end || E' 14 een vriend kan jouw avatar en frame niet wijzigen\n';
  ok := false;
  begin update public.profiles set avatar_frame = 'inferno' where id = ub; exception when others then ok := true; end;
  rep := rep || case when ok then 'OK' else 'FAIL' end || E' 15 B kan A''s vrijgespeelde frame niet zelf dragen\n';

  -- Na een gecorrigeerde uitslag wordt het frame ingetrokken → terug naar 'none'
  reset role;
  res := public.sync_banners(sec, null, jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'frame-inferno')));
  select avatar_frame into t from public.profiles where id = ua;
  rep := rep || case when t = 'none' then 'OK' else 'FAIL' end || E' 16 ingetrokken frame valt terug op geen frame\n';
  select count(*) into cnt from public.profiles where id = ua and avatar_pixel ->> 'id' = 'shadow-ninja' and avatar_emoji = '🐸' and banner = 'rookie-fields' and bio = 'hoi';
  rep := rep || case when cnt = 1 then 'OK' else 'FAIL' end || E' 17 avatar, emoji, banner en bio blijven daarbij onaangeroerd\n';
  -- Een ingetrokken frame dat je niet droeg, raakt je huidige frame niet
  update public.profiles set avatar_frame = 'green' where id = ua;
  res := public.sync_banners(sec, g_inf, null);
  res := public.sync_banners(sec, null, jsonb_build_array(jsonb_build_object('user_id', ua, 'banner_id', 'frame-inferno')));
  select avatar_frame into t from public.profiles where id = ua;
  rep := rep || case when t = 'green' then 'OK' else 'FAIL' end || E' 18 intrekken van een ander frame laat je gekozen frame staan\n';

  -- Terug naar emoji: pixel weg, emoji meteen terug
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  update public.profiles set avatar_pixel = null where id = ua;
  select avatar_emoji into t from public.profiles where id = ua;
  rep := rep || case when t = '🐸' then 'OK' else 'FAIL' end || E' 19 terugwisselen naar emoji: de oude emoji is er nog\n';
  reset role;

  raise exception 'TESTRAPPORT%', rep;
end;
$test$;
