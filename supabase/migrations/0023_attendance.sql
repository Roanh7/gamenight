-- My Attendance 📅
--  * Afmeldingen bewaren: night_declines. Een speler legt alleen zijn EIGEN afmelding vast, zolang de
--    avond gepland of bezig is. Wie zich daarna toch aanmeldt, staat gewoon weer in participants (dat telt).
--    Oude avonden hebben geen afmeldingen: zonder rij = "niet gereageerd", nooit "afgemeld".
--  * Daadwerkelijke aanwezigheid: wie minstens één afgerond potje speelde, was er (automatisch, uit de
--    uitslagen). De host/co-host kan daarnaast iemand "wel aanwezig" zetten die niet meespeelde:
--    night_attendance (alleen via set_attendance). present = false zet het terug op automatisch.
--  * Niets hiervan verandert punten, uitslagen, XP, achievements of banners.

create table if not exists public.night_declines (
  night_id    uuid not null references public.game_nights (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  declined_at timestamptz not null default now(),
  primary key (night_id, user_id)
);
alter table public.night_declines enable row level security;
create policy "leden lezen" on public.night_declines for select to authenticated using (true);
create policy "eigen afmelding" on public.night_declines for insert to authenticated
  with check (user_id = (select auth.uid()) and public.night_status(night_id) in ('planned', 'live'));
grant select, insert on public.night_declines to authenticated;

create table if not exists public.night_attendance (
  night_id uuid not null references public.game_nights (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  present  boolean not null,
  set_by   uuid references public.profiles (id) on delete set null,
  set_at   timestamptz not null default now(),
  primary key (night_id, user_id)
);
alter table public.night_attendance enable row level security;
create policy "leden lezen" on public.night_attendance for select to authenticated using (true);
grant select on public.night_attendance to authenticated;

create or replace function public.set_attendance(p_night uuid, p_user uuid, p_present boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
begin
  if not public.is_night_host(p_night) then
    raise exception 'Alleen de host of co-host kan aanwezigheid aanpassen';
  end if;
  select n.status into v_status from public.game_nights n where n.id = p_night;
  if v_status not in ('live', 'finished') then
    raise exception 'Aanwezigheid kan pas als de avond bezig of afgelopen is';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Speler niet gevonden';
  end if;
  insert into public.night_attendance (night_id, user_id, present, set_by, set_at)
  values (p_night, p_user, coalesce(p_present, false), (select auth.uid()), now())
  on conflict (night_id, user_id) do update
    set present = excluded.present, set_by = excluded.set_by, set_at = excluded.set_at;
end;
$$;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated;
