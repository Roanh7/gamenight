-- Game Specialists & ranglijsten verversen vanzelf als er een potje wordt afgerond, heropend of weggegooid:
-- de tabel matches wordt (alleen-lezen, met de bestaande leesregels) via Supabase Realtime doorgegeven.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;
