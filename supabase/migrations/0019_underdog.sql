-- Underdog Bonus 🐺
--  * Wie onderaan de seizoensranglijst staat én ver genoeg achterstaat, krijgt +2 competitiepunten bij winst.
--  * De status wordt vastgelegd op het moment dat een speler aan een potje wordt toegevoegd
--    (= bij de start), in public.match_underdogs. De uitslag bepaalt nooit achteraf wie underdog was.
--  * De bonus wordt alleen door de database berekend, via een trigger op match_results.
--    Daardoor werkt het automatisch voor alle afrond-functies (solo, teams, rollen), zonder
--    de winnaarslogica aan te raken.
--  * match_results.league_points = basispunten + underdog_bonus. Alle bestaande ranglijsten
--    tellen de bonus dus vanzelf mee. Basispunten = league_points - underdog_bonus.
--  * Heropenen (correctie) wist de uitslag, dus ook de bonus. Opnieuw afronden kent hem opnieuw
--    toe aan de (nieuwe) winnaar, op basis van dezelfde vastgelegde status. Nooit dubbel.
--  * Potje verwijderd → status en bonus verdwijnen mee (on delete cascade).
--  * Latere correcties van OUDERE potjes veranderen een al vastgelegde status niet
--    (zoals bij sport: de stand bij de aftrap telt). De vastgelegde status blijft zichtbaar.

alter table public.match_results add column if not exists underdog_bonus int not null default 0
  constraint match_results_underdog_bonus_range check (underdog_bonus between 0 and 10);

create table if not exists public.match_underdogs (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  season     text not null,          -- bijv. 2026-Q4
  rank       int  not null,          -- officiële positie op dat moment
  points     int  not null,          -- competitiepunten op dat moment
  ref_points int  not null,          -- punten van de nummer drie van onderen
  threshold  int  not null,          -- vereiste achterstand
  bonus      int  not null default 2,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.match_underdogs enable row level security;
-- Iedereen mag lezen; schrijven kan alleen de database zelf (geen insert/update/delete-regels).
create policy "leden lezen" on public.match_underdogs for select to authenticated using (true);
grant select on public.match_underdogs to authenticated;

-- "2026-Q4" (zelfde regel als de app: kwartaal in Nederlandse tijd)
create or replace function private.season_key(p_at timestamptz)
returns text language sql stable set search_path = '' as $$
  select to_char(p_at at time zone 'Europe/Amsterdam', 'YYYY') || '-Q'
         || extract(quarter from p_at at time zone 'Europe/Amsterdam')::int;
$$;

-- Huidige underdogs van het seizoen (officiële ranglijst: punten, dan zeges; oefenavonden tellen niet)
create or replace function private.current_underdogs(p_bonus int default 2)
returns table (user_id uuid, season text, rank int, points int, ref_points int, threshold int, bonus int)
language sql stable security definer set search_path = '' as $$
  with cur as (select private.season_key(now()) as season),
  s as (
    select mr.user_id,
           sum(mr.league_points)::int as pts,
           (count(*) filter (where mr.is_winner))::int as wins
      from public.match_results mr
      join public.matches m on m.id = mr.match_id
      join public.game_nights n on n.id = m.night_id
     where not n.is_practice
       and m.finished_at is not null
       and private.season_key(m.finished_at) = (select cur.season from cur)
     group by mr.user_id
  ), o as (
    select s.user_id, s.pts, s.wins,
           (row_number() over (order by s.pts desc, s.wins desc, s.user_id))::int as pos,
           (rank() over (order by s.pts desc, s.wins desc))::int as rnk,
           (count(*) over ())::int as n
      from s
  ), ref as (
    select o.pts as ref_pts,
           ceil(greatest(10, 0.2 * greatest(o.pts, 0)))::int as thr
      from o where o.n >= 4 and o.pos = o.n - 2
  )
  select o.user_id, (select cur.season from cur), o.rnk, o.pts, ref.ref_pts, ref.thr, p_bonus
    from o cross join ref
   where o.pos >= o.n - 1
     and ref.ref_pts - o.pts >= ref.thr;
$$;

-- Status vastleggen zodra spelers aan een potje worden toegevoegd
create or replace function private.snapshot_underdogs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.match_underdogs (match_id, user_id, season, rank, points, ref_points, threshold, bonus)
  select nr.match_id, u.user_id, u.season, u.rank, u.points, u.ref_points, u.threshold, u.bonus
    from new_rows nr
    join public.matches m on m.id = nr.match_id and m.status = 'live'
    join public.game_nights n on n.id = m.night_id and not n.is_practice
    join private.current_underdogs() u on u.user_id = nr.user_id
  on conflict (match_id, user_id) do nothing;
  return null;
end;
$$;
create or replace trigger match_players_underdogs after insert on public.match_players
  referencing new table as new_rows
  for each statement execute function private.snapshot_underdogs();

-- Bonus toepassen: alleen bij winst, alleen met een vastgelegde status, nooit dubbel
create or replace function private.apply_underdog_bonus()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_base  int;
  v_bonus int := 0;
begin
  v_base := new.league_points - coalesce(new.underdog_bonus, 0);
  if new.is_winner then
    select u.bonus into v_bonus from public.match_underdogs u
     where u.match_id = new.match_id and u.user_id = new.user_id;
  end if;
  new.underdog_bonus := coalesce(v_bonus, 0);
  new.league_points := v_base + new.underdog_bonus;
  return new;
end;
$$;
create or replace trigger match_results_underdog before insert or update of is_winner, league_points, underdog_bonus
  on public.match_results
  for each row execute function private.apply_underdog_bonus();

-- Nieuwsbericht bij een underdog-zege (verdwijnt vanzelf bij heropenen, want dat wist het nieuws van het potje)
create or replace function private.announce_underdog()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_night uuid;
begin
  if new.underdog_bonus > 0 and (tg_op = 'INSERT' or coalesce(old.underdog_bonus, 0) = 0) then
    select m.night_id into v_night from public.matches m where m.id = new.match_id;
    if not exists (select 1 from public.activity a
                    where a.type = 'underdog_win' and a.match_id = new.match_id and a.actor_id = new.user_id) then
      insert into public.activity (type, actor_id, game_id, night_id, match_id, payload)
      values ('underdog_win', new.user_id, new.game_id, v_night, new.match_id,
              jsonb_build_object('bonus', new.underdog_bonus, 'base', new.league_points - new.underdog_bonus));
    end if;
  end if;
  return null;
end;
$$;
create or replace trigger match_results_underdog_news after insert or update on public.match_results
  for each row execute function private.announce_underdog();
