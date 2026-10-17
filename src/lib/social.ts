import "server-only";
import type { createClient } from "./supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Over wie gaat dit nieuwsbericht, en een kort zinnetje om in een melding te zetten. */
export async function aboutActivity(supabase: DB, activityId: number) {
  const { data: a } = await supabase
    .from("activity")
    .select("id, type, actor_id, game_id, night_id, payload")
    .eq("id", activityId)
    .maybeSingle();
  if (!a) return null;
  const payload = (a.payload ?? {}) as Record<string, unknown>;
  const users = new Set<string>();
  if (a.actor_id) users.add(a.actor_id);
  for (const w of (payload.winners as string[] | undefined) ?? []) users.add(w);
  if (typeof payload.old_host === "string") users.add(payload.old_host);
  if (typeof payload.mvp === "string") users.add(payload.mvp);

  const [{ data: game }, { data: night }] = await Promise.all([
    a.game_id ? supabase.from("games").select("name").eq("id", a.game_id).maybeSingle() : Promise.resolve({ data: null }),
    a.night_id
      ? supabase.from("game_nights").select("title").eq("id", a.night_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const g = (game as { name?: string } | null)?.name ?? "een game";
  const n = (night as { title?: string } | null)?.title ?? (payload.title as string | undefined) ?? "een gamenight";
  const label =
    a.type === "member_joined"
      ? "het welkomstbericht"
      : a.type === "game_added"
        ? `de nieuwe game ${g}`
        : a.type === "night_planned"
          ? n
          : a.type === "match_finished"
            ? `de uitslag van ${g}`
            : a.type === "rank_up"
              ? `de stijging in ${g}`
              : a.type === "host_changed"
                ? `de hostwissel bij ${n}`
                : a.type === "night_recap"
                  ? `de recap van ${n}`
                  : "een nieuwsbericht";
  return { users: [...users], label };
}
