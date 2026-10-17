-- Comments onder nieuwsberichten
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  activity_id bigint not null references public.activity (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists comments_activity_idx on public.comments (activity_id, created_at);

alter table public.comments enable row level security;
grant select, insert, delete on public.comments to authenticated;

drop policy if exists "leden lezen" on public.comments;
drop policy if exists "eigen comment" on public.comments;
drop policy if exists "eigen comment weg" on public.comments;
create policy "leden lezen" on public.comments for select to authenticated using (true);
create policy "eigen comment" on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "eigen comment weg" on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));
