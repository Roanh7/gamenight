"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appendToProgram } from "@/lib/program";
import { dateNl, pushLater } from "@/lib/push";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function fail(path: string, message: string): never {
  redirect(`${path}?fout=${encodeURIComponent(message)}`);
}

type DBClient = Awaited<ReturnType<typeof createClient>>;

/** Gegevens voor een melding: titel, datum, host(s), wie er komen en hoe ik heet. */
async function pushInfo(supabase: DBClient, nightId: string, me: string) {
  const [{ data: night }, { data: people }, { data: profile }] = await Promise.all([
    supabase.from("game_nights").select("title, starts_at, host_id, cohost_id").eq("id", nightId).maybeSingle(),
    supabase.from("participants").select("user_id, status").eq("night_id", nightId),
    supabase.from("profiles").select("username").eq("id", me).maybeSingle(),
  ]);
  return {
    title: night?.title ?? "Gamenight",
    startsAt: night?.starts_at as string | undefined,
    hosts: [night?.host_id, night?.cohost_id].filter(Boolean) as string[],
    people: (people ?? []).map((p) => p.user_id as string),
    name: profile?.username ?? "Iemand",
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/* ---------- Avond plannen / wijzigen ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseProgram(fd: FormData, back: string) {
  const vote_mode = str(fd, "vote_mode") === "fixed" ? "fixed" : "vote";
  const game_ids = [...new Set(fd.getAll("game_ids").map(String).filter((g) => UUID.test(g)))];
  if (vote_mode === "fixed" && game_ids.length === 0) fail(back, "Kies minimaal één game voor de avond.");
  return { vote_mode, game_ids: vote_mode === "fixed" ? game_ids : [] };
}

export async function createNight(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = str(formData, "title") || "Gamenight";
  const hostId = str(formData, "host_id") || user.id;
  const poll = str(formData, "date_mode") === "poll";
  const options = poll
    ? [...new Set(formData.getAll("date_options").map(String).filter((d) => !Number.isNaN(Date.parse(d))))]
        .map((d) => new Date(d).toISOString())
        .sort()
    : [];
  if (poll && (options.length < 2 || options.length > 5))
    fail("/agenda/nieuw", "Geef 2 tot 5 verschillende datums voor de datumprikker.");
  const startsAt = poll ? options[0] : str(formData, "starts_at");
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) fail("/agenda/nieuw", "Kies een datum en tijd.");
  const program = parseProgram(formData, "/agenda/nieuw");

  const { data, error } = await supabase
    .from("game_nights")
    .insert({
      title,
      starts_at: new Date(startsAt).toISOString(),
      location: str(formData, "location") || null,
      notes: str(formData, "notes") || null,
      host_id: hostId,
      created_by: user.id,
      date_poll: poll,
      ...program,
    })
    .select("id")
    .single();
  if (error || !data) fail("/agenda/nieuw", "Opslaan lukte niet. Probeer het opnieuw.");
  if (poll) {
    const { error: optErr } = await supabase
      .from("date_options")
      .insert(options.map((starts_at) => ({ night_id: data.id, starts_at })));
    if (optErr) fail(`/agenda/${data.id}`, "De datumopties opslaan lukte niet.");
  }

  // Planner doet zelf ook mee (als hij niet de host is)
  if (hostId !== user.id) {
    await supabase.from("participants").insert({ night_id: data.id, user_id: user.id, status: "pending" });
  }
  const info = await pushInfo(supabase, data.id, user.id);
  pushLater(
    null,
    {
      title: `🎮 Nieuwe gamenight: ${title}`,
      body: poll
        ? `${info.name} plant een avond. Geef aan wanneer je kunt!`
        : `${info.name} plant ${dateNl(startsAt)}. Doe je mee?`,
      url: `/agenda/${data.id}`,
      tag: `avond-${data.id}`,
    },
    user.id,
  );
  revalidatePath("/", "layout");
  redirect(`/agenda/${data.id}`);
}

export async function updateNight(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const startsAt = str(formData, "starts_at");
  const back = `/agenda/${id}/bewerken`;
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) fail(back, "Kies een datum en tijd.");
  const program = parseProgram(formData, back);
  const { data: saved, error } = await supabase
    .from("game_nights")
    .update({
      title: str(formData, "title") || "Gamenight",
      starts_at: new Date(startsAt).toISOString(),
      location: str(formData, "location") || null,
      notes: str(formData, "notes") || null,
      host_id: str(formData, "host_id"),
      cohost_id: (() => {
        const c = str(formData, "cohost_id");
        return c && c !== str(formData, "host_id") ? c : null;
      })(),
      ...(program.vote_mode === "vote" ? { vote_mode: "vote" } : program),
    })
    .eq("id", id)
    .select("id");
  if (error || !saved?.length) fail(back, "Wijzigen lukte niet.");
  revalidatePath("/", "layout");
  redirect(`/agenda/${id}?ok=${encodeURIComponent("Avond bijgewerkt")}`);
}

export async function setNightStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const status = str(formData, "status");
  if (!["planned", "live", "finished", "cancelled"].includes(status)) return;
  // Afronden gaat via de database: die zet de status én maakt de recap voor het nieuws.
  const { error } =
    status === "finished"
      ? await supabase.rpc("finish_night", { p_night: id })
      : await supabase.from("game_nights").update({ status }).eq("id", id);
  if (error) fail(`/agenda/${id}/host`, "Status wijzigen lukte niet.");
  if (status !== "planned") {
    const info = await pushInfo(supabase, id, user.id);
    const msg =
      status === "live"
        ? { title: `🎮 ${info.title} is begonnen!`, body: "Kijk live mee met de scores.", url: `/agenda/${id}` }
        : status === "finished"
          ? { title: `🏁 Recap: ${info.title}`, body: "De avond zit erop. Wie was de MVP?", url: `/agenda/${id}#recap` }
          : { title: `❌ ${info.title} gaat niet door`, body: `${info.name} heeft de avond afgelast.`, url: `/agenda/${id}` };
    pushLater(info.people, { ...msg, tag: `avond-${id}` }, user.id);
  }
  revalidatePath("/", "layout");
  if (status === "finished") redirect(`/agenda/${id}?klaar=1#recap`);
}

export async function deleteNight(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const { error } = await supabase.from("game_nights").delete().eq("id", id);
  if (error) fail(`/agenda/${id}/bewerken`, "Verwijderen lukte niet.");
  revalidatePath("/", "layout");
  redirect("/agenda");
}

/* ---------- Deelnemen & stemmen ---------- */

export async function joinNight(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const { error } = await supabase
    .from("participants")
    .insert({ night_id: id, user_id: user.id, status: "pending" });
  if (error && !error.message.includes("duplicate")) fail(`/agenda/${id}`, "Aanmelden lukte niet.");
  if (!error) {
    const info = await pushInfo(supabase, id, user.id);
    pushLater(
      info.hosts,
      { title: `✋ ${info.name} wil meedoen`, body: `Aan ${info.title}. Bevestig je hem?`, url: `/agenda/${id}/host` },
      user.id,
    );
  }
  revalidatePath(`/agenda/${id}`);
  revalidatePath("/");
}

export async function leaveNight(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  await supabase.from("participants").delete().eq("night_id", id).eq("user_id", user.id);
  revalidatePath(`/agenda/${id}`);
  revalidatePath("/");
}

export async function castVote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const gameId = str(formData, "game_id");
  if (str(formData, "voted") === "1") {
    await supabase.from("votes").delete().eq("night_id", id).eq("user_id", user.id).eq("game_id", gameId);
  } else {
    const { error } = await supabase.from("votes").insert({ night_id: id, user_id: user.id, game_id: gameId });
    if (error && !error.message.includes("duplicate"))
      fail(`/agenda/${id}`, "Stemmen kan alleen zolang de avond nog gepland is.");
  }
  revalidatePath(`/agenda/${id}`);
  revalidatePath("/");
}

/* ---------- Host: co-host & overnemen ---------- */

export async function setCohost(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const userId = str(formData, "user_id");
  const { error } = await supabase.from("game_nights").update({ cohost_id: userId || null }).eq("id", id);
  if (error) fail(`/agenda/${id}/host`, "Co-host instellen lukte niet.");
  revalidatePath(`/agenda/${id}`, "layout");
}

export async function takeOverHost(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const before = await pushInfo(supabase, id, user.id);
  const { error } = await supabase.rpc("take_over_host", { p_night: id });
  if (error) fail(`/agenda/${id}`, error.message);
  pushLater(
    before.hosts,
    { title: `🎮 ${before.name} is nu host`, body: `Van ${before.title}. Jij bent co-host.`, url: `/agenda/${id}` },
    user.id,
  );
  revalidatePath("/", "layout");
  redirect(`/agenda/${id}/host?ok=${encodeURIComponent("Jij bent nu de host")}`);
}

/* ---------- Host: deelnemers ---------- */

export async function confirmParticipant(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const userId = str(formData, "user_id");
  const { data: done } = await supabase
    .from("participants")
    .update({ status: "confirmed" })
    .eq("night_id", id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("user_id");
  if (done?.length) {
    const info = await pushInfo(supabase, id, user.id);
    pushLater([userId], { title: "✅ Je bent erbij!", body: `${info.name} heeft je bevestigd voor ${info.title}.`, url: `/agenda/${id}` }, user.id);
  }
  revalidatePath(`/agenda/${id}`, "layout");
}

export async function confirmAll(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const { data: done } = await supabase
    .from("participants")
    .update({ status: "confirmed" })
    .eq("night_id", id)
    .eq("status", "pending")
    .select("user_id");
  if (done?.length) {
    const info = await pushInfo(supabase, id, user.id);
    pushLater(
      done.map((d) => d.user_id as string),
      { title: "✅ Je bent erbij!", body: `${info.name} heeft je bevestigd voor ${info.title}.`, url: `/agenda/${id}` },
      user.id,
    );
  }
  revalidatePath(`/agenda/${id}`, "layout");
}

export async function removeParticipant(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const userId = str(formData, "user_id");
  await supabase.from("participants").delete().eq("night_id", id).eq("user_id", userId);
  revalidatePath(`/agenda/${id}`, "layout");
}

export async function addParticipant(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const userId = str(formData, "user_id");
  if (!userId) return;
  await supabase
    .from("participants")
    .upsert({ night_id: id, user_id: userId, status: "confirmed" }, { onConflict: "night_id,user_id" });
  const info = await pushInfo(supabase, id, user.id);
  pushLater([userId], { title: "✅ Je bent erbij!", body: `${info.name} heeft je toegevoegd aan ${info.title}.`, url: `/agenda/${id}` }, user.id);
  revalidatePath(`/agenda/${id}`, "layout");
}

/* ---------- Host: potjes ---------- */

export async function startMatch(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const gameId = str(formData, "game_id");
  const players = formData.getAll("players").map(String).filter(Boolean);
  const back = `/agenda/${id}/host`;
  if (!gameId) fail(back, "Kies een game.");
  if (players.length < 2) fail(back, "Kies minimaal 2 spelers.");

  const { data: match, error } = await supabase
    .from("matches")
    .insert({ night_id: id, game_id: gameId })
    .select("id")
    .single();
  if (error || !match) fail(back, "Alleen de host kan een potje starten.");

  const { error: pErr } = await supabase
    .from("match_players")
    .insert(players.map((u) => ({ match_id: match.id, user_id: u })));
  if (pErr) {
    await supabase.from("matches").delete().eq("id", match.id);
    fail(back, "Spelers toevoegen lukte niet.");
  }

  // Avond automatisch op 'live' zetten, en een game die nog niet bij de avond hoorde komt erbij
  const { data: wentLive } = await supabase
    .from("game_nights")
    .update({ status: "live" })
    .eq("id", id)
    .eq("status", "planned")
    .select("id");
  await appendToProgram(supabase, id, gameId);
  if (wentLive?.length) {
    const info = await pushInfo(supabase, id, user.id);
    pushLater(info.people, { title: `🎮 ${info.title} is begonnen!`, body: "Kijk live mee met de scores.", url: `/agenda/${id}`, tag: `avond-${id}` }, user.id);
  }

  revalidatePath("/", "layout");
  redirect(`/agenda/${id}/host/potje/${match.id}`);
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const matchId = str(formData, "match_id");
  await supabase.from("matches").delete().eq("id", matchId);
  revalidatePath("/", "layout");
  redirect(`/agenda/${id}/host`);
}

export async function reopenMatch(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const matchId = str(formData, "match_id");
  const { error } = await supabase.rpc("reopen_match", { p_match_id: matchId });
  if (error) fail(`/agenda/${id}/host/potje/${matchId}`, error.message);
  revalidatePath("/", "layout");
  redirect(`/agenda/${id}/host/potje/${matchId}`);
}

/* ---------- Datumprikker ---------- */

export async function toggleDateVote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const option = str(formData, "option_id");
  const { error } = str(formData, "voted")
    ? await supabase.from("date_votes").delete().eq("option_id", option).eq("user_id", user.id)
    : await supabase.from("date_votes").insert({ option_id: option, user_id: user.id });
  if (error && !error.message.includes("duplicate")) fail(`/agenda/${id}`, "Dat lukte niet. Is de datum al gekozen?");
  revalidatePath(`/agenda/${id}`);
}

export async function pickDate(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData, "night_id");
  const option = str(formData, "option_id");
  const { data: opt } = await supabase
    .from("date_options")
    .select("starts_at")
    .eq("id", option)
    .eq("night_id", id)
    .maybeSingle();
  if (!opt) fail(`/agenda/${id}`, "Die datum bestaat niet (meer).");
  const { data, error } = await supabase
    .from("game_nights")
    .update({ starts_at: opt.starts_at, date_poll: false })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) fail(`/agenda/${id}`, "Alleen de host of co-host kan de datum kiezen.");
  const info = await pushInfo(supabase, id, user.id);
  pushLater(
    null,
    { title: `📅 Datum geprikt: ${info.title}`, body: `Het wordt ${dateNl(opt.starts_at)}.`, url: `/agenda/${id}`, tag: `avond-${id}` },
    user.id,
  );
  revalidatePath("/", "layout");
  redirect(`/agenda/${id}?ok=${encodeURIComponent("Datum gekozen! 📅")}`);
}

/* ---------- Game toevoegen tijdens de avond ---------- */

export async function addGameToNight(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "night_id");
  const gameId = str(formData, "game_id");
  const back = `/agenda/${id}/host`;
  if (!UUID.test(gameId)) fail(back, "Kies een game.");
  const ok = await appendToProgram(supabase, id, gameId);
  if (!ok) fail(back, "Toevoegen lukte niet.");
  revalidatePath("/", "layout");
  redirect(`${back}?game=${gameId}&ok=${encodeURIComponent("Game toegevoegd aan de avond!")}#potje`);
}
