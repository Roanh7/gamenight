-- Oefenavond: een avond om de app uit te proberen die nergens voor meetelt.
--  * Potjes van een oefenavond tellen niet mee in de ranglijsten (views hieronder) en niet
--    voor XP, records en seizoenen (filter in de app, src/lib/data.ts).
--  * Er komt geen nieuws van een oefenavond (trigger op activity).
--  * Of een avond een oefenavond is, ligt vast bij het aanmaken en kan daarna niet meer veranderen.

alter table public.game_nights add column if not exists is_practice boolean not null default false;

create or replace function private.keep_practice_flag()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.is_practice := old.is_practice;
  return new;
end;
$$;
create or replace trigger game_nights_keep_practice before update on public.game_nights
  for each row execute function private.keep_practice_flag();

-- Geen nieuwsberichten over een oefenavond
create or replace function private.skip_practice_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_night uuid := new.night_id;
begin
  if v_night is null and new.match_id is not null then
    select m.night_id into v_night from public.matches m where m.id = new.match_id;
  end if;
  if v_night is not null and exists (select 1 from public.game_nights n where n.id = v_night and n.is_practice) then
    return null;
  end if;
  return new;
end;
$$;
create or replace trigger activity_skip_practice before insert on public.activity
  for each row execute function private.skip_practice_activity();

-- Ranglijsten zonder oefenpotjes
create or replace view public.game_leaderboard with (security_invoker = true) as
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
join public.matches m on m.id = mr.match_id
join public.game_nights n on n.id = m.night_id
where not n.is_practice
group by mr.game_id, mr.user_id;

create or replace view public.overall_leaderboard with (security_invoker = true) as
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
join public.matches m on m.id = mr.match_id
join public.game_nights n on n.id = m.night_id
where not n.is_practice
group by mr.user_id;
