-- Co-host, host overnemen, avond-recap, avatars, reacties en datumprikker.

-- ============ Co-host ============
alter table public.game_nights add column if not exists cohost_id uuid references public.profiles (id) on delete set null;

-- Host-rechten gelden nu ook voor de co-host (alle bestaande regels gebruiken deze functies)
create or replace function public.is_night_host(p_night uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_nights n
     where n.id = p_night and (n.host_id = auth.uid() or n.cohost_id = auth.uid())
  );
$$;

create or replace function public.is_match_host(p_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.game_nights n on n.id = m.night_id
     where m.id = p_match and (n.host_id = auth.uid() or n.cohost_id = auth.uid())
  );
$$;

drop policy if exists "avond wijzigen" on public.game_nights;
create policy "avond wijzigen" on public.game_nights for update to authenticated
  using (host_id = (select auth.uid()) or cohost_id = (select auth.uid()) or created_by = (select auth.uid()))
  with check (true);

-- Co-host is altijd bevestigd deelnemer
create or replace function public.on_night_host_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.host_id is distinct from old.host_id then
    insert into public.participants (night_id, user_id, status)
    values (new.id, new.host_id, 'confirmed')
    on conflict (night_id, user_id) do update set status = 'confirmed';
  end if;
  if new.cohost_id is not null and new.cohost_id is distinct from old.cohost_id then
    insert into public.participants (night_id, user_id, status)
    values (new.id, new.cohost_id, 'confirmed')
    on conflict (night_id, user_id) do update set status = 'confirmed';
  end if;
  return new;
end;
$$;

-- Host overnemen: een bevestigde deelnemer wordt host, de oude host wordt co-host
create or replace function public.take_over_host(p_night uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_night public.game_nights;
begin
  select * into v_night from public.game_nights where id = p_night for update;
  if not found then raise exception 'Avond niet gevonden'; end if;
  if v_night.status not in ('planned', 'live') then raise exception 'Deze avond is al voorbij'; end if;
  if v_night.host_id = auth.uid() then return; end if;
  if not exists (select 1 from public.participants
                  where night_id = p_night and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'Alleen bevestigde deelnemers kunnen de host overnemen';
  end if;
  update public.game_nights
     set cohost_id = case when cohost_id = auth.uid() then host_id else coalesce(cohost_id, host_id) end,
         host_id = auth.uid()
   where id = p_night;
  insert into public.activity (type, actor_id, night_id, payload)
  values ('host_changed', auth.uid(), p_night, jsonb_build_object('old_host', v_night.host_id));
end;
$$;
revoke all on function public.take_over_host(uuid) from public, anon;
grant execute on function public.take_over_host(uuid) to authenticated;

-- ============ Avond-recap ============
create or replace function public.finish_night(p_night uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_night   public.game_nights;
  v_matches int;
  v_stats   jsonb;
  v_mvp     uuid;
  v_top     int;
  v_games   jsonb;
begin
  select * into v_night from public.game_nights where id = p_night for update;
  if not found then raise exception 'Avond niet gevonden'; end if;
  if not public.is_night_host(p_night) then raise exception 'Alleen de host kan de avond afsluiten'; end if;

  update public.game_nights set status = 'finished' where id = p_night;
  delete from public.activity where night_id = p_night and type = 'night_recap';

  select count(*) into v_matches from public.matches where night_id = p_night and status = 'finished';
  if v_matches = 0 then return; end if;

  -- Per speler: punten, zeges, potjes, laatste plekken
  with per as (
    select mr.user_id,
           sum(mr.league_points)::int as points,
           count(*) filter (where mr.is_winner)::int as wins,
           count(*)::int as played,
           count(*) filter (where mr.placement = (select max(x.placement) from public.match_results x where x.match_id = mr.match_id)
                              and mr.placement > 1)::int as last
      from public.match_results mr
      join public.matches m on m.id = mr.match_id
     where m.night_id = p_night and m.status = 'finished'
     group by mr.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'points', points, 'wins', wins,
                                               'played', played, 'last', last)
                            order by points desc, wins desc), '[]'::jsonb),
         max(points)
    into v_stats, v_top
    from per;

  -- MVP alleen bij een unieke koploper
  if (select count(*) from jsonb_array_elements(v_stats) e where (e ->> 'points')::int = v_top) = 1 then
    select (e ->> 'user_id')::uuid into v_mvp
      from jsonb_array_elements(v_stats) e
     where (e ->> 'points')::int = v_top
     limit 1;
  end if;

  select coalesce(jsonb_agg(distinct m.game_id), '[]'::jsonb) into v_games
    from public.matches m where m.night_id = p_night and m.status = 'finished';

  insert into public.activity (type, actor_id, night_id, payload)
  values ('night_recap', v_mvp, p_night,
          jsonb_build_object('title', v_night.title, 'matches', v_matches, 'games', v_games,
                             'stats', v_stats, 'mvp', v_mvp));
end;
$$;
revoke all on function public.finish_night(uuid) from public, anon;
grant execute on function public.finish_night(uuid) to authenticated;

-- ============ Avatars ============
alter table public.profiles add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);
alter table public.profiles add column if not exists avatar_emoji text check (avatar_emoji is null or char_length(avatar_emoji) <= 16);

-- ============ Reacties op nieuws ============
create table if not exists public.reactions (
  activity_id bigint not null references public.activity (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji       text not null check (emoji in ('🔥', '😂', '👏', '🧂', '💀', '👑')),
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id, emoji)
);
alter table public.reactions enable row level security;
grant select, insert, delete on public.reactions to authenticated;
create policy "leden lezen" on public.reactions for select to authenticated using (true);
create policy "eigen reactie" on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "eigen reactie weg" on public.reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============ Datumprikker ============
alter table public.game_nights add column if not exists date_poll boolean not null default false;

create table if not exists public.date_options (
  id        uuid primary key default gen_random_uuid(),
  night_id  uuid not null references public.game_nights (id) on delete cascade,
  starts_at timestamptz not null,
  unique (night_id, starts_at)
);
create table if not exists public.date_votes (
  option_id uuid not null references public.date_options (id) on delete cascade,
  user_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (option_id, user_id)
);
create index if not exists date_options_night_idx on public.date_options (night_id);

create or replace function public.is_night_planner(p_night uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_nights n
     where n.id = p_night
       and (n.host_id = auth.uid() or n.cohost_id = auth.uid() or n.created_by = auth.uid())
  );
$$;
create or replace function public.option_open(p_option uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.date_options o join public.game_nights n on n.id = o.night_id
     where o.id = p_option and n.date_poll and n.status = 'planned'
  );
$$;
revoke all on function public.is_night_planner(uuid), public.option_open(uuid) from public, anon;
grant execute on function public.is_night_planner(uuid), public.option_open(uuid) to authenticated;

alter table public.date_options enable row level security;
alter table public.date_votes enable row level security;
grant select, insert, delete on public.date_options, public.date_votes to authenticated;

create policy "leden lezen" on public.date_options for select to authenticated using (true);
create policy "planner voegt opties toe" on public.date_options for insert to authenticated
  with check (public.is_night_planner(night_id));
create policy "planner haalt opties weg" on public.date_options for delete to authenticated
  using (public.is_night_planner(night_id));

create policy "leden lezen" on public.date_votes for select to authenticated using (true);
create policy "ik kan dan" on public.date_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.option_open(option_id));
create policy "ik kan toch niet" on public.date_votes for delete to authenticated
  using (user_id = (select auth.uid()) and public.option_open(option_id));
