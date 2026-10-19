-- Podium Ceremony 🏆
--  * Zodra een avond écht wordt afgesloten (status wordt 'finished'), komt er één rij in
--    public.night_ceremonies. Spelers met de app open krijgen die via Supabase Realtime binnen
--    en zien dan de ceremonie.
--  * Gebeurt in dezelfde transactie als het afsluiten: mislukt het afsluiten, dan is er geen ceremonie.
--  * Nog een keer op "afsluiten" drukken (of een correctie achteraf) verandert niets: de status was al
--    'finished', dus er komt geen nieuwe ceremonie. Pas na "terug naar gepland" + opnieuw afsluiten wel.
--  * De ceremonie zelf leest alleen: punten, XP en achievements veranderen nooit.

create table if not exists public.night_ceremonies (
  night_id    uuid primary key references public.game_nights (id) on delete cascade,
  closed_at   timestamptz not null default now(),
  is_practice boolean not null default false
);
alter table public.night_ceremonies enable row level security;
create policy "leden lezen" on public.night_ceremonies for select to authenticated using (true);
grant select on public.night_ceremonies to authenticated;

create or replace function private.announce_ceremony()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    insert into public.night_ceremonies (night_id, closed_at, is_practice)
    values (new.id, now(), new.is_practice)
    on conflict (night_id) do update set closed_at = excluded.closed_at, is_practice = excluded.is_practice;
  end if;
  return null;
end;
$$;
create or replace trigger game_nights_ceremony after update of status on public.game_nights
  for each row execute function private.announce_ceremony();

-- Realtime: alleen deze kleine tabel wordt live doorgegeven
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'night_ceremonies') then
    alter publication supabase_realtime add table public.night_ceremonies;
  end if;
end;
$$;
