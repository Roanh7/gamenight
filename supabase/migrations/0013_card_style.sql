-- Gekozen stijl voor je Player Card
alter table public.profiles add column if not exists card_style text
  check (card_style is null or card_style in ('gameboy', 'rpg', 'arcade', 'trading'));
