-- Gratis starter-banners: die mag iedereen kiezen zonder ze vrij te spelen.
-- Houd deze lijst gelijk aan de banners met condition "default" in src/lib/banners.ts.
create or replace function private.check_banner_choice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.banner is distinct from old.banner
     and not (new.banner = any (array['rookie-fields', 'sunset-beach', 'neon-arcade', 'snowy-peaks', 'cherry-blossom', 'deep-sea']))
     and not exists (
       select 1 from public.banner_unlocks u
        where u.user_id = new.id and u.banner_id = new.banner and u.revoked_at is null
     ) then
    raise exception 'Deze banner heb je nog niet vrijgespeeld';
  end if;
  return new;
end;
$$;
