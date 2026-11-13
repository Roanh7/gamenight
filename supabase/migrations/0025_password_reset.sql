-- Wachtwoord vergeten 🔑 (zonder e-mail)
--  * De app verstuurt (nog) geen e-mails, dus herstellen gaat met een eenmalige HERSTELCODE van de beheerder.
--  * Beheerders staan in private.app_admins (niet via de app te lezen of te wijzigen).
--  * De beheerder maakt in de app een code voor een speler (24 uur geldig, max. 5 pogingen, alleen de
--    nieuwste code werkt). De code wordt alleen als hash bewaard; de beheerder ziet hem één keer.
--  * De speler vult op /wachtwoord-vergeten zijn e-mail of gebruikersnaam, de code en een nieuw wachtwoord in.
--  * Alleen het wachtwoord verandert; profiel, punten, XP en alle andere gegevens blijven onaangeroerd.

create table if not exists private.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
insert into private.app_admins (user_id)
select id from auth.users where id = '01e07e13-e67f-4d8a-8536-3a2d06efe4ac'
on conflict do nothing;

create table if not exists private.password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   int not null default 0
);
create index if not exists password_resets_user on private.password_resets (user_id, created_at desc);

-- Ben jij beheerder?
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.app_admins a where a.user_id = (select auth.uid()));
$$;
grant execute on function public.is_app_admin() to authenticated;

-- Naam van de beheerder(s), voor de uitleg op de herstelpagina
create or replace function public.app_admin_names()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.username order by p.username), '{}')
    from private.app_admins a join public.profiles p on p.id = a.user_id;
$$;
grant execute on function public.app_admin_names() to anon, authenticated;

-- Beheerder: spelers met hun inlog-e-mail (om iemand te helpen die zijn e-mail kwijt is)
create or replace function public.admin_players()
returns table (id uuid, username text, email text, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then
    raise exception 'Alleen voor de beheerder';
  end if;
  return query
    select p.id, p.username, u.email::text, u.last_sign_in_at
      from public.profiles p join auth.users u on u.id = p.id
     order by lower(p.username);
end;
$$;
grant execute on function public.admin_players() to authenticated;

-- Beheerder: nieuwe herstelcode voor een speler (oudere, ongebruikte codes vervallen)
create or replace function public.admin_create_reset_code(p_user uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- geen 0/O, 1/I/L
  v_code  text := '';
  i       int;
begin
  if not public.is_app_admin() then
    raise exception 'Alleen voor de beheerder';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'Speler niet gevonden';
  end if;
  for i in 1..8 loop
    v_code := v_code || substr(v_alpha, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(v_alpha)), 1);
  end loop;
  update private.password_resets set used_at = now()
   where user_id = p_user and used_at is null;
  insert into private.password_resets (user_id, code_hash, created_by, expires_at)
  values (p_user, extensions.crypt(v_code, extensions.gen_salt('bf', 10)), (select auth.uid()), now() + interval '24 hours');
  return v_code;
end;
$$;
grant execute on function public.admin_create_reset_code(uuid) to authenticated;

-- Speler: nieuw wachtwoord instellen met de herstelcode. Geeft het e-mailadres terug (om meteen in te loggen).
create or replace function public.reset_password_with_code(p_login text, p_code text, p_password text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_user  uuid;
  v_email text;
  v_reset private.password_resets%rowtype;
  v_login text := lower(trim(coalesce(p_login, '')));
  v_code  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Je nieuwe wachtwoord moet minimaal 6 tekens zijn';
  end if;
  select u.id, u.email into v_user, v_email
    from auth.users u left join public.profiles p on p.id = u.id
   where lower(u.email) = v_login or lower(p.username) = v_login
   limit 1;
  if v_user is not null then
    select * into v_reset from private.password_resets r
     where r.user_id = v_user and r.used_at is null and r.expires_at > now() and r.attempts < 5
     order by r.created_at desc limit 1
     for update;
  end if;
  if v_user is null or v_reset.id is null then
    raise exception 'Code ongeldig of verlopen. Vraag de beheerder om een nieuwe code.';
  end if;
  update private.password_resets set attempts = attempts + 1 where id = v_reset.id;
  if extensions.crypt(v_code, v_reset.code_hash) <> v_reset.code_hash then
    if v_reset.attempts + 1 >= 5 then
      update private.password_resets set used_at = now() where id = v_reset.id;
    end if;
    return null; -- foute code (de poging telt wel)
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         updated_at = now()
   where id = v_user;
  update private.password_resets set used_at = now() where id = v_reset.id;
  return v_email;
end;
$$;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;
