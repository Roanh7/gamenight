-- ============================================================
-- GAME NIGHT — database schema
-- ============================================================

-- ---------- Instellingen (alleen leesbaar via functies) ----------
create table public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
insert into public.app_settings (key, value) values ('invite_code', 'PLAYER2');

-- ---------- Profielen ----------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null check (username ~ '^[A-Za-z0-9_]{2,20}$'),
  avatar_color text not null default 'red'
               check (avatar_color in ('red','blue','green','yellow','purple','orange','pink','teal')),
  bio          text check (char_length(bio) <= 140),
  created_at   timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- ---------- Games ----------
create table public.games (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 1 and 60),
  icon                 text not null default 'gamepad',
  color                text not null default 'red'
                       check (color in ('red','blue','green','yellow','purple','orange','pink','teal')),
  description          text check (char_length(description) <= 500),
  rules                text check (char_length(rules) <= 4000),
  min_players          int not null default 2 check (min_players >= 1),
  max_players          int check (max_players is null or max_players >= min_players),
  scoring_mode         text not null default 'highest_wins'
                       check (scoring_mode in ('highest_wins','lowest_wins')),
  placement_points     int[] not null default '{10,6,4,2,1}',
  participation_points int not null default 0 check (participation_points >= 0),
  created_by           uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now()
);

-- ---------- Gamenights ----------
create table public.game_nights (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 80),
  starts_at  timestamptz not null,
  location   text check (char_length(location) <= 120),
  notes      text check (char_length(notes) <= 1000),
  host_id    uuid not null references public.profiles (id),
  status     text not null default 'planned'
             check (status in ('planned','live','finished','cancelled')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index game_nights_starts_at_idx on public.game_nights (starts_at);
create index game_nights_host_idx on public.game_nights (host_id);

-- Eén stem per persoon per avond
create table public.votes (
  night_id   uuid not null references public.game_nights (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id    uuid not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (night_id, user_id)
);
create index votes_game_idx on public.votes (game_id);

-- Deelnemers: zelf aanmelden (pending), host bevestigt (confirmed)
create table public.participants (
  night_id   uuid not null references public.game_nights (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','confirmed')),
  created_at timestamptz not null default now(),
  primary key (night_id, user_id)
);
create index participants_user_idx on public.participants (user_id);

-- ---------- Potjes & scores ----------
create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  night_id    uuid not null references public.game_nights (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete cascade,
  status      text not null default 'live' check (status in ('live','finished')),
  winner_id   uuid references public.profiles (id) on delete set null,
  is_draw     boolean not null default false,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index matches_night_idx on public.matches (night_id);
create index matches_game_idx on public.matches (game_id);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (match_id, user_id)
);

create table public.score_entries (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  round    int not null check (round between 1 and 200),
  points   numeric not null default 0,
  unique (match_id, user_id, round)
);

-- Eindresultaat per speler (wordt alleen door finalize_match geschreven)
create table public.match_results (
  match_id      uuid not null references public.matches (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  game_id       uuid not null references public.games (id) on delete cascade,
  total         numeric not null,
  placement     int not null,
  league_points int not null,
  is_winner     boolean not null,
  primary key (match_id, user_id)
);
create index match_results_game_idx on public.match_results (game_id);
create index match_results_user_idx on public.match_results (user_id);

-- ---------- Nieuwsfeed ----------
create table public.activity (
  id         bigint generated always as identity primary key,
  type       text not null,
  actor_id   uuid references public.profiles (id) on delete cascade,
  game_id    uuid references public.games (id) on delete cascade,
  night_id   uuid references public.game_nights (id) on delete cascade,
  match_id   uuid references public.matches (id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_created_idx on public.activity (created_at desc);

-- ---------- Leaderboards ----------
create view public.game_leaderboard with (security_invoker = true) as
select
  mr.game_id,
  mr.user_id,
  count(*)::int                                   as played,
  (count(*) filter (where mr.is_winner))::int     as wins,
  sum(mr.league_points)::int                      as points,
  round(avg(mr.total), 1)                         as avg_score,
  (rank() over (
     partition by mr.game_id
     order by sum(mr.league_points) desc, count(*) filter (where mr.is_winner) desc
  ))::int                                         as rank
from public.match_results mr
group by mr.game_id, mr.user_id;

create view public.overall_leaderboard with (security_invoker = true) as
select
  mr.user_id,
  count(*)::int                                   as played,
  (count(*) filter (where mr.is_winner))::int     as wins,
  sum(mr.league_points)::int                      as points,
  count(distinct mr.game_id)::int                 as games_played,
  (rank() over (
     order by sum(mr.league_points) desc, count(*) filter (where mr.is_winner) desc
  ))::int                                         as rank
from public.match_results mr
group by mr.user_id;

-- ============================================================
-- Hulpfuncties
-- ============================================================
create or replace function public.is_night_host(p_night uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_nights n where n.id = p_night and n.host_id = auth.uid());
$$;

create or replace function public.is_match_host(p_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.game_nights n on n.id = m.night_id
    where m.id = p_match and n.host_id = auth.uid()
  );
$$;

create or replace function public.match_is_live(p_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches m where m.id = p_match and m.status = 'live');
$$;

create or replace function public.night_status(p_night uuid)
returns text language sql stable security definer set search_path = '' as $$
  select n.status from public.game_nights n where n.id = p_night;
$$;

-- Voor het registratieformulier (ook zonder login te gebruiken)
create or replace function public.check_invite_code(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select upper(trim(value)) = upper(trim(coalesce(p_code, '')))
       from public.app_settings where key = 'invite_code'),
    true);
$$;

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- Nieuw account -> profiel (+ uitnodigingscode controleren)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_code     text;
  v_username text;
begin
  select value into v_code from public.app_settings where key = 'invite_code';
  if v_code is not null and v_code <> ''
     and upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', ''))) <> upper(trim(v_code)) then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  v_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if v_username is null then
    v_username := left(regexp_replace(split_part(new.email, '@', 1), '[^A-Za-z0-9_]', '', 'g'), 16);
  end if;
  if char_length(v_username) < 2 then v_username := 'speler'; end if;
  -- Unieke naam garanderen
  while exists (select 1 from public.profiles where lower(username) = lower(v_username)) loop
    v_username := left(v_username, 16) || floor(random() * 1000)::int;
  end loop;

  insert into public.profiles (id, username, avatar_color)
  values (new.id, v_username,
          coalesce(nullif(new.raw_user_meta_data ->> 'avatar_color', ''), 'red'));

  insert into public.activity (type, actor_id) values ('member_joined', new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nieuwe game -> nieuws
create or replace function public.on_game_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity (type, actor_id, game_id) values ('game_added', new.created_by, new.id);
  return new;
end;
$$;
create trigger games_after_insert after insert on public.games
  for each row execute function public.on_game_created();

-- Nieuwe avond -> host automatisch bevestigd + nieuws
create or replace function public.on_night_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.participants (night_id, user_id, status)
  values (new.id, new.host_id, 'confirmed')
  on conflict (night_id, user_id) do update set status = 'confirmed';
  insert into public.activity (type, actor_id, night_id) values ('night_planned', new.created_by, new.id);
  return new;
end;
$$;
create trigger game_nights_after_insert after insert on public.game_nights
  for each row execute function public.on_night_created();

-- Nieuwe host -> ook bevestigd als deelnemer
create or replace function public.on_night_host_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.host_id is distinct from old.host_id then
    insert into public.participants (night_id, user_id, status)
    values (new.id, new.host_id, 'confirmed')
    on conflict (night_id, user_id) do update set status = 'confirmed';
  end if;
  return new;
end;
$$;
create trigger game_nights_after_update after update on public.game_nights
  for each row execute function public.on_night_host_changed();

-- ============================================================
-- Potje afronden: totalen, plaatsen, winnaar, ranking-nieuws
-- ============================================================
create or replace function public.finalize_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match     public.matches;
  v_game      public.games;
  v_players   int;
  v_top_count int;
  v_winner    uuid;
  v_before    jsonb;
  r           record;
  v_old       int;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Potje niet gevonden'; end if;
  if not public.is_night_host(v_match.night_id) then
    raise exception 'Alleen de host van deze avond kan dit potje afronden';
  end if;
  if v_match.status = 'finished' then raise exception 'Dit potje is al afgerond'; end if;

  select count(*) into v_players from public.match_players where match_id = p_match_id;
  if v_players < 2 then raise exception 'Er zijn minimaal 2 spelers nodig'; end if;

  select * into v_game from public.games where id = v_match.game_id;

  select coalesce(jsonb_object_agg(user_id::text, rank), '{}'::jsonb)
    into v_before
    from public.game_leaderboard where game_id = v_game.id;

  insert into public.match_results (match_id, user_id, game_id, total, placement, league_points, is_winner)
  select p_match_id, t.user_id, v_game.id, t.total, t.placement,
         coalesce(v_game.placement_points[t.placement], 0) + v_game.participation_points,
         false
  from (
    select mp.user_id,
           coalesce(sum(se.points), 0) as total,
           (rank() over (order by
              case when v_game.scoring_mode = 'lowest_wins'
                   then coalesce(sum(se.points), 0)
                   else -coalesce(sum(se.points), 0) end))::int as placement
    from public.match_players mp
    left join public.score_entries se
      on se.match_id = mp.match_id and se.user_id = mp.user_id
    where mp.match_id = p_match_id
    group by mp.user_id
  ) t;

  select count(*) into v_top_count from public.match_results where match_id = p_match_id and placement = 1;
  if v_top_count = 1 then
    select user_id into v_winner from public.match_results where match_id = p_match_id and placement = 1;
    update public.match_results set is_winner = true where match_id = p_match_id and user_id = v_winner;
  end if;

  update public.matches
     set status = 'finished', finished_at = now(),
         winner_id = v_winner, is_draw = (v_top_count > 1)
   where id = p_match_id;

  insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
  values ('match_finished', v_winner, v_game.id, v_match.night_id, p_match_id,
          jsonb_build_object('draw', v_top_count > 1, 'players', v_players));

  -- Wie is er gestegen in de ranking?
  for r in select user_id, rank from public.game_leaderboard where game_id = v_game.id loop
    v_old := (v_before ->> r.user_id::text)::int;
    if (v_old is null and r.rank = 1) or (v_old is not null and r.rank < v_old) then
      insert into public.activity (type, actor_id, game_id, match_id, payload)
      values ('rank_up', r.user_id, v_game.id, p_match_id,
              jsonb_build_object('old_rank', v_old, 'new_rank', r.rank));
    end if;
  end loop;
end;
$$;

-- Afgerond potje weer openzetten (bij een foutje)
create or replace function public.reopen_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Potje niet gevonden'; end if;
  if not public.is_night_host(v_match.night_id) then
    raise exception 'Alleen de host van deze avond kan dit doen';
  end if;
  delete from public.match_results where match_id = p_match_id;
  delete from public.activity where match_id = p_match_id;
  update public.matches set status = 'live', finished_at = null, winner_id = null, is_draw = false
   where id = p_match_id;
end;
$$;

-- ============================================================
-- Rechten & Row Level Security
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.game_leaderboard, public.overall_leaderboard to authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.match_results, public.activity from authenticated;
revoke update on public.matches from authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.check_invite_code(text), public.username_available(text) to anon, authenticated;
grant execute on function public.finalize_match(uuid), public.reopen_match(uuid),
  public.is_night_host(uuid), public.is_match_host(uuid), public.match_is_live(uuid),
  public.night_status(uuid) to authenticated;

alter table public.profiles      enable row level security;
alter table public.games         enable row level security;
alter table public.game_nights   enable row level security;
alter table public.votes         enable row level security;
alter table public.participants  enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
alter table public.score_entries enable row level security;
alter table public.match_results enable row level security;
alter table public.activity      enable row level security;

-- Lezen: alle ingelogde leden zien alles
create policy "leden lezen" on public.profiles      for select to authenticated using (true);
create policy "leden lezen" on public.games         for select to authenticated using (true);
create policy "leden lezen" on public.game_nights   for select to authenticated using (true);
create policy "leden lezen" on public.votes         for select to authenticated using (true);
create policy "leden lezen" on public.participants  for select to authenticated using (true);
create policy "leden lezen" on public.matches       for select to authenticated using (true);
create policy "leden lezen" on public.match_players for select to authenticated using (true);
create policy "leden lezen" on public.score_entries for select to authenticated using (true);
create policy "leden lezen" on public.match_results for select to authenticated using (true);
create policy "leden lezen" on public.activity      for select to authenticated using (true);

-- Profielen
create policy "eigen profiel wijzigen" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Games
create policy "game toevoegen" on public.games for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "game wijzigen" on public.games for update to authenticated
  using (true) with check (true);
create policy "game verwijderen zonder potjes" on public.games for delete to authenticated
  using (created_by = (select auth.uid())
         and not exists (select 1 from public.matches m where m.game_id = games.id));

-- Gamenights
create policy "avond plannen" on public.game_nights for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "avond wijzigen" on public.game_nights for update to authenticated
  using (host_id = (select auth.uid()) or created_by = (select auth.uid()))
  with check (true);
create policy "avond verwijderen" on public.game_nights for delete to authenticated
  using (host_id = (select auth.uid()) or created_by = (select auth.uid()));

-- Stemmen (alleen zolang de avond gepland is)
create policy "stemmen" on public.votes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.night_status(night_id) = 'planned');
create policy "stem wijzigen" on public.votes for update to authenticated
  using (user_id = (select auth.uid()) and public.night_status(night_id) = 'planned')
  with check (user_id = (select auth.uid()));
create policy "stem intrekken" on public.votes for delete to authenticated
  using (user_id = (select auth.uid()) and public.night_status(night_id) = 'planned');

-- Deelnemers
create policy "aanmelden" on public.participants for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and status = 'pending'
       and public.night_status(night_id) in ('planned','live'))
    or public.is_night_host(night_id));
create policy "host bevestigt" on public.participants for update to authenticated
  using (public.is_night_host(night_id)) with check (public.is_night_host(night_id));
create policy "afmelden" on public.participants for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_night_host(night_id));

-- Potjes (alleen host; afronden via functie)
create policy "host start potje" on public.matches for insert to authenticated
  with check (public.is_night_host(night_id) and status = 'live');
create policy "host verwijdert lopend potje" on public.matches for delete to authenticated
  using (public.is_night_host(night_id) and status = 'live');

create policy "host kiest spelers" on public.match_players for insert to authenticated
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));
create policy "host haalt speler weg" on public.match_players for delete to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id));

create policy "host voert scores in" on public.score_entries for insert to authenticated
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));
create policy "host past scores aan" on public.score_entries for update to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id))
  with check (public.is_match_host(match_id) and public.match_is_live(match_id));
create policy "host wist scores" on public.score_entries for delete to authenticated
  using (public.is_match_host(match_id) and public.match_is_live(match_id));
