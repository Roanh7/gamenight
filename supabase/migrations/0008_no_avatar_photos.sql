-- Geen profielfoto's: alleen emoji of letter.
update public.profiles set avatar_url = null where avatar_url is not null;
alter table public.profiles drop constraint if exists profiles_no_photo;
alter table public.profiles add constraint profiles_no_photo check (avatar_url is null);

-- Uploaden en wijzigen kan niet meer (verwijderen van eigen oude foto's mag nog).
drop policy if exists "avatar uploaden" on storage.objects;
drop policy if exists "avatar wijzigen" on storage.objects;

select (select count(*) from public.profiles where avatar_url is not null) as fotos_over,
       (select count(*) from storage.objects where bucket_id = 'avatars') as bestanden_in_opslag,
       (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'avatar%') as opslag_regels;
