-- Vrijspeelbare profielbanners (alleen cosmetisch).
--  * Welke banners er zijn en wanneer je ze krijgt, staat in de code (src/lib/banners.ts).
--  * Hier bewaren we alleen: welke banner je gekozen hebt, en welke je hebt vrijgespeeld.
--  * Vrijspelen gebeurt alleen door de server (met de geheime sleutel), nooit vanuit de browser.
--  * Je kunt alleen een banner kiezen die je echt hebt vrijgespeeld (trigger op profiles).
--  * Geen DELETE: een banner die door een gecorrigeerde uitslag niet meer klopt, krijgt revoked_at.

alter table public.profiles add column if not exists banner text not null default 'rookie-fields'
  constraint profiles_banner_len check (char_length(banner) between 1 and 40);

create table if not exists public.banner_unlocks (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  banner_id   text not null check (char_length(banner_id) between 1 and 40),
  unlocked_at timestamptz not null default now(),
  revoked_at  timestamptz,
  seen        boolean not null default false,
  announced   boolean not null default false,
  primary key (user_id, banner_id)
);
alter table public.banner_unlocks enable row level security;
-- Iedereen mag lezen; schrijven kan niemand via de API (er zijn geen insert/update/delete-regels),
-- alleen de functies hieronder.
create policy "leden lezen" on public.banner_unlocks for select to authenticated using (true);
grant select on public.banner_unlocks to authenticated;

-- Alleen een vrijgespeelde banner mag je kiezen (Rookie Fields heeft iedereen)
create or replace function private.check_banner_choice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.banner is distinct from old.banner and new.banner <> 'rookie-fields' and not exists (
    select 1 from public.banner_unlocks u
     where u.user_id = new.id and u.banner_id = new.banner and u.revoked_at is null
  ) then
    raise exception 'Deze banner heb je nog niet vrijgespeeld';
  end if;
  return new;
end;
$$;
create or replace trigger profiles_check_banner before update of banner on public.profiles
  for each row execute function private.check_banner_choice();

-- Server: banners toekennen (te roepen met de anon-sleutel + het geheim, zoals de pushmeldingen) en (na een correctie) intrekken.
-- p_grant:  [{"user_id": "...", "banner_id": "inferno", "announce": true, "name": "Inferno", "rarity": "rare", "emoji": "🔥"}]
-- p_revoke: [{"user_id": "...", "banner_id": "inferno"}]
create or replace function public.sync_banners(p_secret text, p_grant jsonb, p_revoke jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g        jsonb;
  r        jsonb;
  v_new    boolean;
  v_ann    boolean;
  v_added  int := 0;
  v_back   int := 0;
  v_gone   int := 0;
begin
  perform private.check_push_secret(p_secret);

  for g in select * from jsonb_array_elements(coalesce(p_grant, '[]'::jsonb)) loop
    insert into public.banner_unlocks (user_id, banner_id)
    values ((g ->> 'user_id')::uuid, g ->> 'banner_id')
    on conflict (user_id, banner_id) do nothing;
    v_new := found;
    if v_new then
      v_added := v_added + 1;
    else
      -- Was hij ingetrokken? Dan krijg je hem stil terug (geen nieuwe animatie of nieuws).
      update public.banner_unlocks set revoked_at = null
       where user_id = (g ->> 'user_id')::uuid and banner_id = g ->> 'banner_id' and revoked_at is not null;
      if found then v_back := v_back + 1; end if;
    end if;

    -- Nieuwsbericht voor bijzondere banners, maar één keer per speler per banner
    if coalesce((g ->> 'announce')::boolean, false) then
      update public.banner_unlocks set announced = true
       where user_id = (g ->> 'user_id')::uuid and banner_id = g ->> 'banner_id' and not announced
       returning true into v_ann;
      if coalesce(v_ann, false) then
        insert into public.activity (type, actor_id, payload)
        values ('banner_unlocked', (g ->> 'user_id')::uuid,
                jsonb_build_object('banner', g ->> 'banner_id', 'name', g ->> 'name', 'rarity', g ->> 'rarity', 'emoji', g ->> 'emoji'));
      end if;
      v_ann := null;
    end if;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p_revoke, '[]'::jsonb)) loop
    update public.banner_unlocks set revoked_at = now()
     where user_id = (r ->> 'user_id')::uuid and banner_id = r ->> 'banner_id' and revoked_at is null;
    if found then v_gone := v_gone + 1; end if;
  end loop;

  return jsonb_build_object('added', v_added, 'restored', v_back, 'revoked', v_gone);
end;
$$;

-- Speler: "ik heb de unlock-animatie gezien" (alleen je eigen banners)
create or replace function public.mark_banners_seen(p_banners text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.banner_unlocks set seen = true
   where user_id = (select auth.uid()) and banner_id = any (p_banners) and not seen;
end;
$$;
