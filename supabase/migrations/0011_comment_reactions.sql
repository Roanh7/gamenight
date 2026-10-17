-- Emoji-reacties op comments
create table if not exists public.comment_reactions (
  comment_id bigint not null references public.comments (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji      text not null check (emoji in ('🔥', '😂', '👏', '🧂', '💀', '👑')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);
alter table public.comment_reactions enable row level security;
grant select, insert, delete on public.comment_reactions to authenticated;
create policy "leden lezen" on public.comment_reactions for select to authenticated using (true);
create policy "eigen reactie" on public.comment_reactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "eigen reactie weg" on public.comment_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
