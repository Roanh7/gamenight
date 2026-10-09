-- Pushmeldingen: abonnementen per toestel, een geheime sleutel voor de server,
-- en een herinnering een uur voor de avond (via pg_cron + pg_net).

-- ============ Geheimen (niet bereikbaar via de API) ============
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.secrets (
  key   text primary key,
  value text not null
);
-- De waarde wordt los ingevuld (niet in git):
-- insert into private.secrets (key, value) values ('push', '<PUSH_SECRET>') on conflict (key) do update set value = excluded.value;

create or replace function private.check_push_secret(p_secret text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or not exists (select 1 from private.secrets where key = 'push' and value = p_secret) then
    raise exception 'Geen toegang';
  end if;
end;
$$;

-- ============ Abonnementen ============
create table if not exists public.push_subscriptions (
  endpoint   text primary key check (char_length(endpoint) <= 1000),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
grant select, delete on public.push_subscriptions to authenticated;
create policy "eigen toestellen zien" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "eigen toestel weg" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Opslaan via een functie: een toestel dat eerst van iemand anders was, gaat over naar jou.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- Alleen de server (met de geheime sleutel) mag de toestellen van anderen ophalen.
create or replace function public.push_targets(p_secret text, p_users uuid[] default null)
returns table (user_id uuid, endpoint text, p256dh text, auth text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_push_secret(p_secret);
  return query
    select s.user_id, s.endpoint, s.p256dh, s.auth
      from public.push_subscriptions s
     where p_users is null or s.user_id = any (p_users);
end;
$$;
revoke all on function public.push_targets(text, uuid[]) from public;
grant execute on function public.push_targets(text, uuid[]) to anon, authenticated;

-- Verlopen toestellen opruimen
create or replace function public.push_forget(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_push_secret(p_secret);
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke all on function public.push_forget(text, text) from public;
grant execute on function public.push_forget(text, text) to anon, authenticated;

-- ============ Herinnering een uur van tevoren ============
alter table public.game_nights add column if not exists reminder_sent boolean not null default false;

-- Datum verschoven? Dan mag er opnieuw een herinnering uit.
create or replace function public.reset_reminder()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminder_sent := false;
  end if;
  return new;
end;
$$;
drop trigger if exists game_nights_reset_reminder on public.game_nights;
create trigger game_nights_reset_reminder before update on public.game_nights
  for each row execute function public.reset_reminder();

-- Avonden die over 30–75 minuten beginnen, met wie er komen. Zet ze meteen op "verstuurd".
create or replace function public.due_reminders(p_secret text)
returns table (night_id uuid, title text, starts_at timestamptz, location text, user_ids uuid[])
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_push_secret(p_secret);
  return query
    with due as (
      update public.game_nights n
         set reminder_sent = true
       where n.status = 'planned'
         and not n.date_poll
         and not n.reminder_sent
         and n.starts_at between now() + interval '30 minutes' and now() + interval '75 minutes'
      returning n.id, n.title, n.starts_at, n.location
    )
    select d.id, d.title, d.starts_at, d.location,
           coalesce(array_agg(p.user_id) filter (where p.user_id is not null), '{}')
      from due d
      left join public.participants p on p.night_id = d.id
     group by d.id, d.title, d.starts_at, d.location;
end;
$$;
revoke all on function public.due_reminders(text) from public;
grant execute on function public.due_reminders(text) to anon, authenticated;

-- ============ Elke 10 minuten de app laten kijken of er herinneringen uit moeten ============
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function private.ping_reminders()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://gamenight-theta.vercel.app/api/push/herinneringen',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select value from private.secrets where key = 'push')
    ),
    body := '{}'::jsonb
  );
end;
$$;

select cron.unschedule('gamenight-herinneringen')
 where exists (select 1 from cron.job where jobname = 'gamenight-herinneringen');
select cron.schedule('gamenight-herinneringen', '*/10 * * * *', 'select private.ping_reminders()');
