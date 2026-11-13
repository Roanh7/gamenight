import Link from "next/link";
import type { GameNight, Match, MatchResult, Participant, Profile } from "@/lib/types";
import type { CupStats } from "@/lib/smashCup";
import { confirmSmashCup } from "@/app/agenda/actions";
import { SmashCupCard } from "./SmashCup";
import { CupIcon } from "./CupIcon";
import { SubmitButton } from "./SubmitButton";

/**
 * 🏆 Het Cup-blok op de pagina van een Smash Bros Championship Cup-avond:
 * de regerend kampioen, en voor de host/co-host het bevestigen van de nieuwe kampioen.
 */
export function SmashCupNight({
  night,
  stats,
  profiles,
  isHost,
  smashMatches,
  results,
  participants,
  today,
}: {
  night: GameNight;
  stats: CupStats;
  profiles: Map<string, Profile>;
  isHost: boolean;
  smashMatches: Match[];
  results: MatchResult[];
  participants: Participant[];
  today: string;
}) {
  const mine = stats.editions.find((e) => e.night_id === night.id);
  const done = smashMatches.filter((m) => m.status === "finished");
  const doneIds = new Set(done.map((m) => m.id));
  const canConfirm = isHost && !night.is_practice && (night.status === "live" || night.status === "finished") && done.length > 0;

  // Wie mag winnaar zijn: host, co-host, bevestigde deelnemers en iedereen met een uitslag op deze avond
  const ids = new Set<string>([night.host_id, ...(night.cohost_id ? [night.cohost_id] : [])]);
  participants.filter((p) => p.status === "confirmed").forEach((p) => ids.add(p.user_id));
  results.forEach((r) => ids.add(r.user_id));
  // Voorstel: meeste Smash-zeges van deze avond
  const wins = new Map<string, number>();
  results.filter((r) => doneIds.has(r.match_id) && r.is_winner).forEach((r) => wins.set(r.user_id, (wins.get(r.user_id) ?? 0) + 1));
  const suggested = mine?.winner_id ?? [...wins.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const options = [...ids]
    .map((id) => profiles.get(id))
    .filter(Boolean)
    .sort((a, b) => (wins.get(b!.id) ?? 0) - (wins.get(a!.id) ?? 0) || a!.username.localeCompare(b!.username)) as Profile[];
  const winner = mine ? profiles.get(mine.winner_id) : undefined;

  const form = (label: string) => (
    <form action={confirmSmashCup} className="grid gap-2">
      <input type="hidden" name="night_id" value={night.id} />
      <label className="text-xs font-black" htmlFor="cup-winner">
        Wie heeft de Championship Cup gewonnen?
      </label>
      <select id="cup-winner" name="winner_id" defaultValue={suggested} required className="input">
        <option value="" disabled>
          Kies de kampioen…
        </option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.username}
            {wins.get(p.id) ? ` — ${wins.get(p.id)}× Smash gewonnen` : ""}
          </option>
        ))}
      </select>
      <SubmitButton className="btn btn-yellow w-full" pendingText="Beker wordt overgedragen…">
        {label}
      </SubmitButton>
      <p className="text-[11px] font-bold text-muted">Alleen de bekertitel verandert. Punten, XP en uitslagen blijven precies zoals ze zijn.</p>
    </form>
  );

  return (
    <div id="smash-cup" className="mt-4 scroll-mt-20">
      <SmashCupCard stats={stats} profiles={profiles} today={today} title="SMASH BROS CHAMPIONSHIP CUP">
        <div className="grid gap-3 border-t-2 border-line px-3 py-3 text-sm font-bold">
          {mine && winner ? (
            <>
              <p className="flex items-center gap-1.5">
                <CupIcon size={15} title={null} />
                {mine.defended ? `${winner.username} heeft de titel verdedigd! 👑` : `${winner.username} is de nieuwe kampioen! 🏆`}
              </p>
              <Link href={`/agenda/${night.id}/cup`} className="btn btn-yellow btn-sm w-full">
                🏆 Bekijk de bekeruitreiking
              </Link>
              {isHost && canConfirm && (
                <details className="rounded-xl border-2 border-line px-3 py-2">
                  <summary className="cursor-pointer text-xs font-black">Verkeerde winnaar? Corrigeer de uitslag</summary>
                  <div className="pt-2">{form("✅ Winnaar aanpassen")}</div>
                </details>
              )}
            </>
          ) : night.status === "planned" ? (
            <p>
              🎮 Op deze avond is de Smash een officieel bekerevenement. De winnaar krijgt de wisselbeker en wordt{" "}
              <b>REIGNING SMASH CHAMPION</b>.
            </p>
          ) : night.status === "cancelled" ? (
            <p>Deze Cup is afgelast. De beker blijft bij de huidige kampioen.</p>
          ) : canConfirm ? (
            form("🏆 Bevestig de kampioen")
          ) : isHost ? (
            <p>Zodra er een Smash-potje is afgerond, kun je hier de winnaar van de Cup bevestigen.</p>
          ) : (
            <p>De host bevestigt na afloop wie de Championship Cup heeft gewonnen.</p>
          )}
        </div>
      </SmashCupCard>
    </div>
  );
}
