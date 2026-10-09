-- Meerdere games per avond:
--   vote_mode 'vote'  = iedereen mag op meerdere games stemmen
--   vote_mode 'fixed' = planner/host kiest zelf de games (game_ids), geen stemming
alter table public.game_nights add column if not exists vote_mode text not null default 'vote'
  check (vote_mode in ('vote', 'fixed'));
alter table public.game_nights add column if not exists game_ids uuid[] not null default '{}';

-- Eén stem per persoon per game (in plaats van één stem per persoon per avond)
alter table public.votes drop constraint if exists votes_pkey;
alter table public.votes add primary key (night_id, user_id, game_id);

create or replace function public.night_accepts_votes(p_night uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_nights n
     where n.id = p_night and n.status = 'planned' and n.vote_mode = 'vote'
  );
$$;
revoke all on function public.night_accepts_votes(uuid) from public, anon;
grant execute on function public.night_accepts_votes(uuid) to authenticated;

drop policy if exists "stemmen" on public.votes;
drop policy if exists "stem wijzigen" on public.votes;
drop policy if exists "stem intrekken" on public.votes;
create policy "stemmen" on public.votes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.night_accepts_votes(night_id));
create policy "stem intrekken" on public.votes for delete to authenticated
  using (user_id = (select auth.uid()) and public.night_accepts_votes(night_id));
