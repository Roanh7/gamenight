-- Ultimate Avatar System 🎮 (pixel-avatars + vrij te spelen avatar-frames). Alleen cosmetisch.
--  * profiles.avatar_pixel: je pixel-personage of een kant-en-klaar personage (jsonb). Leeg = gewoon je
--    emoji/letter zoals altijd. avatar_emoji blijft altijd bewaard, dus terugwisselen kan zonder verlies.
--  * profiles.avatar_frame: het frame rond je avatar. 'none', 'classic', 'blue' en 'green' heeft iedereen;
--    de rest moet vrijgespeeld zijn (banner_unlocks met id 'frame-<naam>', toegekend door de server).
--  * Een frame kiezen dat je niet hebt, weigert de database, ook bij een nagemaakt verzoek.
--  * Wordt een frame later ingetrokken (gecorrigeerde uitslag), dan valt een gekozen frame terug op 'none'.
--  * Alles is toevoegend: bestaande kolommen en gegevens blijven onaangeroerd.

alter table public.profiles add column if not exists avatar_pixel jsonb
  constraint profiles_avatar_pixel_ok check (
    avatar_pixel is null or (
      jsonb_typeof(avatar_pixel) = 'object'
      and avatar_pixel ->> 'k' in ('pixel', 'preset')
      and pg_column_size(avatar_pixel) <= 2000
    )
  );

alter table public.profiles add column if not exists avatar_frame text not null default 'none'
  constraint profiles_avatar_frame_ok check (
    avatar_frame in ('none', 'classic', 'blue', 'green', 'inferno', 'thunder', 'dragon', 'diamond',
                     'royal', 'cosmic', 'graveyard', 'halloffame')
  );

-- Alleen een gratis of vrijgespeeld frame mag je kiezen
create or replace function private.check_frame_choice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.avatar_frame is not distinct from old.avatar_frame then
    return new;
  end if;
  if new.avatar_frame in ('none', 'classic', 'blue', 'green') then
    return new;
  end if;
  if not exists (
    select 1 from public.banner_unlocks u
     where u.user_id = new.id and u.banner_id = 'frame-' || new.avatar_frame and u.revoked_at is null
  ) then
    raise exception 'Dit frame heb je nog niet vrijgespeeld';
  end if;
  return new;
end;
$$;
create or replace trigger profiles_check_frame before insert or update of avatar_frame on public.profiles
  for each row execute function private.check_frame_choice();

-- Frame ingetrokken? Dan gaat een speler die hem droeg terug naar 'none'.
create or replace function private.reset_lost_frame()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p set avatar_frame = 'none'
   where p.id = new.user_id and 'frame-' || p.avatar_frame = new.banner_id;
  return null;
end;
$$;
create or replace trigger banner_unlocks_frame_reset after update of revoked_at on public.banner_unlocks
  for each row when (new.revoked_at is not null and old.revoked_at is null and new.banner_id like 'frame-%')
  execute function private.reset_lost_frame();
