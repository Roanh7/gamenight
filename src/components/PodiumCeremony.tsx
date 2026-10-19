"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { audioReady, playDrumroll, playFanfare, playReveal, playTick, playUnlock, setSound, soundOn, unlockAudio } from "@/lib/sfx";
import { markCeremonySeen } from "./CeremonyListener";

export type CeremonyPlayer = { id: string; name: string; color: string | null; url: string | null; emoji: string | null; pixel?: unknown; frame?: string | null };
export type CeremonyData = {
  nightId: string;
  title: string;
  closedAt: string | null;
  steps: { place: 1 | 2 | 3; players: { player: CeremonyPlayer; points: number }[] }[];
  standings: { player: CeremonyPlayer; points: number; wins: number; played: number; place: number }[];
  stats: { icon: string; label: string; value: string }[];
};

type Scene = "intro" | "c3" | "c2" | "c1" | "winners" | "third" | "second" | "drum" | "champion" | "final";

const DURATION: Record<Scene, number> = {
  intro: 2400,
  c3: 900,
  c2: 900,
  c1: 900,
  winners: 1500,
  third: 3000,
  second: 3200,
  drum: 2400,
  champion: 4200,
  final: 0,
};

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
const TONE = { 1: "gold", 2: "silver", 3: "bronze" } as const;
const PLACE_LABEL = { 1: "FIRST PLACE", 2: "SECOND PLACE", 3: "THIRD PLACE" } as const;

/** Vast "willekeurig" getal per index (zelfde op server en telefoon). */
const rnd = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function PodiumCeremony({ data, auto = false }: { data: CeremonyData; auto?: boolean }) {
  const has = (p: 1 | 2 | 3) => data.steps.find((s) => s.place === p);
  const timeline = useMemo<Scene[]>(() => {
    if (!data.steps.length) return ["intro", "final"];
    const t: Scene[] = ["intro", "c3", "c2", "c1", "winners"];
    if (data.steps.some((s) => s.place === 3)) t.push("third");
    if (data.steps.some((s) => s.place === 2)) t.push("second");
    t.push("drum", "champion", "final");
    return t;
  }, [data.steps]);

  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0); // telt op bij "opnieuw bekijken"
  const [sound, setSoundState] = useState(true);
  const [ready, setReady] = useState(false);
  const scene = timeline[step];

  // Geluidsinstelling en de "al gezien"-markering (tegen een tweede automatische start)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- instelling staat op het toestel
    setSoundState(soundOn());
    setReady(audioReady());
    if (data.closedAt) markCeremonySeen(data.nightId, data.closedAt);
  }, [data.nightId, data.closedAt]);

  // Volgende scène
  useEffect(() => {
    const d = DURATION[scene];
    if (!d) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, timeline.length - 1)), d);
    return () => clearTimeout(t);
  }, [scene, step, run, timeline.length]);

  // Geluid per scène (alleen als het mag én de browser het toestaat)
  useEffect(() => {
    if (!sound) return;
    if (scene === "c3" || scene === "c2") playTick();
    else if (scene === "c1") playTick(true);
    else if (scene === "winners") playUnlock();
    else if (scene === "third") playReveal(1);
    else if (scene === "second") playReveal(2);
    else if (scene === "drum") playDrumroll(2);
    else if (scene === "champion") playFanfare();
  }, [scene, run, sound]);

  // Niet achter de ceremonie kunnen scrollen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggleSound = useCallback(() => {
    unlockAudio();
    const next = !sound || !audioReady();
    setSound(next);
    setSoundState(next);
    setTimeout(() => setReady(audioReady()), 120);
  }, [sound]);

  const replay = () => {
    unlockAudio();
    setRun((r) => r + 1);
    setStep(0);
  };

  const first = has(1);
  const champs = first?.players ?? [];

  return (
    <div className="podium-root fixed inset-0 z-[80] overflow-y-auto overflow-x-hidden bg-[#0b0a14] text-white" role="dialog" aria-label="Podium Ceremony">
      <Stars dim={scene === "drum"} />
      {(scene === "champion" || scene === "final") && <Confetti key={`c-${run}-${scene}`} burst={scene === "champion"} />}

      <div
        className="relative mx-auto flex min-h-full max-w-md flex-col px-4"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {scene !== "final" ? (
          <div key={`${run}-${scene}`} className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
            {scene === "intro" && (
              <div className="pd-intro">
                <p className="text-6xl" aria-hidden>
                  🎮
                </p>
                <p className="pixel pd-flicker mt-5 text-[19px] leading-relaxed text-yellow">GAME NIGHT COMPLETE</p>
                <p className="pixel mt-3 text-[11px] tracking-widest opacity-90">THE FINAL RESULTS</p>
                <p className="mt-4 max-w-full truncate text-sm font-bold opacity-70">{data.title}</p>
              </div>
            )}
            {(scene === "c3" || scene === "c2" || scene === "c1") && (
              <p className="pixel pd-count text-[110px] leading-none text-yellow" aria-live="assertive">
                {scene.slice(1)}
              </p>
            )}
            {scene === "winners" && <p className="pixel pd-zoom text-[22px] leading-relaxed text-yellow">🏆 THE WINNERS</p>}
            {(scene === "third" || scene === "second") && (
              <Reveal step={has(scene === "third" ? 3 : 2)!} />
            )}
            {scene === "drum" && (
              <p className="pixel text-[17px] leading-loose">
                AND THE WINNER IS<span className="pd-dots">…</span>
              </p>
            )}
            {scene === "champion" && first && (
              <div className="pd-champ flex w-full flex-col items-center">
                <div className="pd-rays gold" aria-hidden />
                <p className="pixel relative text-[15px] leading-relaxed text-yellow">
                  👑 GAME NIGHT {champs.length > 1 ? "CO-CHAMPIONS" : "CHAMPION"}!
                </p>
                <div className="relative mt-9 flex flex-wrap justify-center gap-3">
                  {champs.slice(0, 4).map(({ player }) => (
                    <span key={player.id} className="pd-bounce inline-flex">
                      <Avatar name={player.name} color={player.color} url={player.url} emoji={player.emoji} pixel={player.pixel} frame={player.frame} size="xl" crown />
                    </span>
                  ))}
                </div>
                <p className="relative mt-5 line-clamp-2 w-full break-words text-3xl font-black">
                  {champs.map((c) => c.player.name).join(" & ")}
                </p>
                <p className="pixel relative mt-3 text-[13px] text-yellow">{champs[0].points} POINTS</p>
                <div className="pd-block gold relative mt-5 h-16 w-40" aria-hidden>
                  <span className="pixel">1</span>
                </div>
              </div>
            )}
          </div>
        ) : data.steps.length ? (
          <Final data={data} run={run} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center pb-6 text-center">
            <p className="text-5xl" aria-hidden>
              🏁
            </p>
            <p className="pixel mt-5 text-[15px] leading-relaxed text-yellow">GAME NIGHT COMPLETE</p>
            <p className="mt-3 text-sm font-bold opacity-85">
              Er zijn vanavond geen potjes afgerond, dus er is geen podium. Tot de volgende Game Night!
            </p>
          </div>
        )}

        {/* Bediening */}
        {scene !== "final" ? (
          <div
            className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md gap-2 px-4"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
          >
            <button type="button" onClick={() => setStep(timeline.length - 1)} className="pd-btn flex-1">
              ⏭️ OVERSLAAN
            </button>
            <button type="button" onClick={toggleSound} className="pd-btn flex-1" aria-pressed={sound && ready}>
              {sound && ready ? "🔊 GELUID AAN" : sound ? "🔊 TIK VOOR GELUID" : "🔇 GELUID UIT"}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-2.5">
            <button type="button" onClick={replay} className="pd-btn pd-btn-gold">
              🔄 OPNIEUW BEKIJKEN
            </button>
            <Link href={`/agenda/${data.nightId}#recap`} className="pd-btn">
              📜 BEKIJK RECAP
            </Link>
            <Link href="/" className="pd-btn">
              🏠 TERUG NAAR HOME
            </Link>
            {auto && <p className="pt-1 text-center text-[11px] font-bold opacity-60">Je kunt de ceremonie later terugkijken via de recap.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Reveal({ step }: { step: CeremonyData["steps"][number] }) {
  const tone = TONE[step.place];
  const shared = step.players.length > 1;
  return (
    <div className="flex w-full flex-col items-center">
      <div className={`pd-rays ${tone}`} aria-hidden />
      <p className="pixel relative text-[15px] leading-relaxed" style={{ color: `var(--pd-${tone})` }}>
        {MEDAL[step.place]} {shared ? `SHARED ${PLACE_LABEL[step.place]}` : PLACE_LABEL[step.place]}
      </p>
      <div className="pd-pop relative mt-6 flex flex-wrap justify-center gap-3">
        {step.players.slice(0, 4).map(({ player }) => (
          <Avatar key={player.id} name={player.name} color={player.color} url={player.url} emoji={player.emoji} pixel={player.pixel} frame={player.frame} size="xl" />
        ))}
      </div>
      <p className="pd-pop relative mt-4 line-clamp-2 w-full break-words text-2xl font-black">
        {step.players.map((p) => p.player.name).join(" & ")}
      </p>
      <p className="pixel relative mt-2 text-[12px] opacity-90">{step.players[0].points} POINTS</p>
      <div className={`pd-block ${tone} relative mt-5 ${step.place === 2 ? "h-12 w-36" : "h-9 w-32"}`} aria-hidden>
        <span className="pixel">{step.place}</span>
      </div>
    </div>
  );
}

function Final({ data, run }: { data: CeremonyData; run: number }) {
  const order = [2, 1, 3] as const;
  const heights = { 1: "h-28", 2: "h-20", 3: "h-14" } as const;
  const steps = order.map((p) => data.steps.find((s) => s.place === p)).filter(Boolean) as CeremonyData["steps"];
  return (
    <div key={run} className="pd-final pt-2">
      <p className="pixel text-center text-[13px] text-yellow">🏆 PODIUM</p>
      <p className="mt-1 truncate text-center text-xs font-bold opacity-70">{data.title}</p>

      {/* Het podium: 2 – 1 – 3 */}
      <div className="relative mt-4 grid items-end gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s) => (
          <div key={s.place} className="relative flex min-w-0 flex-col items-center">
            <div className={`pd-spot ${TONE[s.place]}`} aria-hidden />
            <div className="relative flex -space-x-3">
              {s.players.slice(0, 3).map(({ player }) => (
                <Avatar
                  key={player.id}
                  name={player.name}
                  color={player.color}
                  url={player.url}
                  emoji={player.emoji} pixel={player.pixel} frame={player.frame}
                  size={s.place === 1 && s.players.length === 1 ? "xl" : "lg"}
                  crown={s.place === 1}
                />
              ))}
            </div>
            <p className="relative mt-1.5 w-full truncate text-center text-sm font-black" title={s.players.map((p) => p.player.name).join(" & ")}>
              {s.players.length > 2
                ? `${s.players.length} spelers`
                : s.players.map((p) => p.player.name).join(" & ")}
            </p>
            <p className="pixel relative text-[9px] opacity-85">{s.players[0].points} PT</p>
            <div className={`pd-block ${TONE[s.place]} pd-rise relative mt-2 w-full ${heights[s.place]}`}>
              <span className="pixel">{s.place}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-2 rounded-b-md border-2 border-t-0 border-black bg-[#2b2640]" aria-hidden />

      {/* Eindstand */}
      <section className="mt-6 overflow-hidden rounded-xl border-2 border-black bg-[#1b1828] shadow-[0_4px_0_#000]">
        <p className="pixel border-b-2 border-black bg-[#2b2640] px-3 py-2 text-[10px] text-yellow">🏆 FINAL STANDINGS</p>
        <ol className="divide-y-2 divide-[#2b2640]">
          {data.standings.map((r) => (
            <li key={r.player.id} className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-7 text-center text-sm font-black">
                {r.place <= 3 ? MEDAL[r.place as 1 | 2 | 3] : <span className="pixel text-[10px] opacity-70">{r.place}</span>}
              </span>
              <Avatar name={r.player.name} color={r.player.color} url={r.player.url} emoji={r.player.emoji} pixel={r.player.pixel} frame={r.player.frame} size="sm" />
              <span className="min-w-0 flex-1 truncate font-black">{r.player.name}</span>
              <span className="shrink-0 text-xs font-bold opacity-70">{r.wins}🏆</span>
              <span className="pixel shrink-0 whitespace-nowrap text-right text-[10px]">{r.points} PT</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Statistieken */}
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {data.stats.map((s) => (
          <li key={s.label} className="min-w-0 rounded-xl border-2 border-black bg-[#1b1828] px-3 py-2">
            <p className="truncate text-sm font-black">
              {s.icon} {s.value}
            </p>
            <p className="truncate text-[11px] font-bold opacity-70">{s.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stars({ dim }: { dim: boolean }) {
  return (
    <div className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ${dim ? "opacity-20" : "opacity-100"}`} aria-hidden>
      {Array.from({ length: 46 }, (_, i) => (
        <span
          key={i}
          className="pd-star"
          style={{
            left: `${(rnd(i) * 100).toFixed(1)}%`,
            top: `${(rnd(i, 2) * 100).toFixed(1)}%`,
            animationDelay: `${(rnd(i, 3) * 3).toFixed(2)}s`,
            animationDuration: `${(2 + rnd(i, 4) * 3).toFixed(2)}s`,
            width: i % 5 === 0 ? 4 : 2,
            height: i % 5 === 0 ? 4 : 2,
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI = ["#e4002b", "#2f5de0", "#22a04b", "#ffc527", "#7b4fd6", "#f5761a", "#e6489b", "#12a3a0"];

function Confetti({ burst }: { burst: boolean }) {
  return (
    <div className="pd-confetti pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: burst ? 60 : 32 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(rnd(i, 5) * 100).toFixed(1)}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(rnd(i, 6) * (burst ? 1.2 : 6)).toFixed(2)}s`,
            animationDuration: `${((burst ? 2.6 : 6) + rnd(i, 7) * 3).toFixed(2)}s`,
            width: i % 3 === 0 ? 8 : 6,
            height: i % 3 === 0 ? 5 : 6,
          }}
        />
      ))}
    </div>
  );
}
