-- Favoriete Player Card per speler
alter table public.profiles add column if not exists favorite_card text
  check (favorite_card is null or char_length(favorite_card) <= 40);
