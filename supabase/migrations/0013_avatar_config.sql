-- Zelfgemaakte pixel-avatar (keuzes als klein JSON-object)
alter table public.profiles add column if not exists avatar_config jsonb
  check (avatar_config is null or (jsonb_typeof(avatar_config) = 'object' and pg_column_size(avatar_config) <= 1000));
