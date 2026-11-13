"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { CupIcon } from "./CupIcon";
import { Confetti, Stars, type CeremonyPlayer } from "./PodiumCeremony";
import { audioReady, playDrumroll, playFanfare, playTick, playUnlock, setSound, soundOn, unlockAudio } from "@/lib/sfx";

export type CupCeremonyData = {
  nightId: string;
  title: string;
  winner: CeremonyPlayer;
  /** Zelfde kampioen als vorige keer → titelverdediging */
  defended: boolean;
  previous: CeremonyPlayer | null;
  edition: number;
  cups: number;
  defenses: number;
  heldOn: string; // "30 december 2025"
};

type Scene = "intro" | "c3" | "c2" | "c1" | "drum" | "crown" | "final";
const TIMELINE: Scene[] = ["intro", "c3", "c2", "c1", "drum", "crown", "final"];
const DURATION: Record<Scene, number> = { intro: 2800, c3: 900, c2: 900, c1: 900, drum: 2600, crown: 4600, final: 0 };

/**
 * 🏆 Bekeruitreiking van de Smash Bros Championship Cup — een gouden variant van de Podium Ceremony.
 * Alleen lezen: er verandert niets aan punten, XP of de beker zelf.
 */
export function SmashCupCeremony({ data, auto = false }: { data: CupCeremonyData; auto?: boolean }) {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [sound, setSoundState] = useState(true);
  const [ready, setReady] = useState(false);
  const scene = TIMELINE[step];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- instelling staat op het toestel
    setSoundState(soundOn());
    setReady(audioReady());
  }, []);

  useEffect(() => {
    const d = DURATION[scene];
    if (!d) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, TIMELINE.length - 1)), d);
    return () => clearTimeout(t);
  }, [scene, step, run]);

  useEffect(() => {
    if (!sound) return;
    if (scene === "intro") playUnlock();
    else if (scene === "c3" || scene === "c2") playTick();
    else if (scene === "c1") playTick(true);
    else if (scene === "drum") playDrumroll(2);
    else if (scene === "crown") playFanfare();
  }, [scene, run, sound]);

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

  const w = data.winner;
  const headline = data.defended ? "👑 THE KING REMAINS!" : "🏆 A NEW SMASH CHAMPION IS CROWNED!";

  return (
    <div className="podium-root cup-ceremony fixed inset-0 z-[80] overflow-y-auto overflow-x-hidden bg-[#0d0a06] text-white" role="dialog" aria-label="Smash Cup bekeruitreiking">
      <Stars dim={scene === "drum"} />
      {(scene === "crown" || scene === "final") && <Confetti key={`c-${run}-${scene}`} burst={scene === "crown"} />}

      <div
        className="relative mx-auto flex min-h-full max-w-md flex-col px-4"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {scene !== "final" ? (
          <div key={`${run}-${scene}`} className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
            {scene === "intro" && (
              <div className="pd-intro flex flex-col items-center">
                <CupIcon size={84} title={null} className="cup-float" />
                <p className="pixel pd-flicker mt-6 text-[17px] leading-relaxed text-[#ffc527]">SMASH BROS</p>
                <p className="pixel mt-2 text-[13px] leading-relaxed text-[#ffc527]">CHAMPIONSHIP CUP</p>
                <p className="pixel mt-4 text-[10px] tracking-widest opacity-85">EDITIE #{data.edition}</p>
                <p className="mt-3 max-w-full truncate text-sm font-bold opacity-70">{data.title}</p>
              </div>
            )}
            {(scene === "c3" || scene === "c2" || scene === "c1") && (
              <p className="pixel pd-count text-[110px] leading-none text-[#ffc527]" aria-live="assertive">
                {scene.slice(1)}
              </p>
            )}
            {scene === "drum" && (
              <p className="pixel text-[16px] leading-loose">
                AND THE CHAMPION IS<span className="pd-dots">…</span>
              </p>
            )}
            {scene === "crown" && (
              <div className="pd-champ flex w-full flex-col items-center">
                <div className="pd-rays gold" aria-hidden />
                <p className="pixel relative text-[14px] leading-relaxed text-[#ffc527]">{headline}</p>
                <div className="relative mt-8">
                  <span className="pd-bounce inline-flex">
                    <Avatar name={w.name} color={w.color} url={w.url} emoji={w.emoji} pixel={w.pixel} frame={w.frame} size="xl" crown={data.defended} />
                  </span>
                </div>
                <p className="relative mt-5 line-clamp-2 w-full break-words text-3xl font-black">{w.name}</p>
                <div className="relative mt-5">
                  <CupIcon size={96} title={null} className="cup-float" />
                </div>
                <p className="pixel relative mt-4 text-[10px] leading-relaxed text-[#ffc527]">🏆 REIGNING SMASH CHAMPION</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center pb-4 pt-6 text-center">
            <CupIcon size={72} title={null} className="cup-float" />
            <p className="pixel mt-5 text-[13px] leading-relaxed text-[#ffc527]">{headline}</p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-[#ffc527]/60 bg-white/5 px-4 py-3 text-left">
              <Avatar name={w.name} color={w.color} url={w.url} emoji={w.emoji} pixel={w.pixel} frame={w.frame} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-xl font-black">{w.name}</p>
                <p className="text-xs font-bold opacity-75">Kampioen sinds {data.heldOn}</p>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-3 gap-2">
              {[
                { v: String(data.cups), l: data.cups === 1 ? "SMASH CUP" : "SMASH CUPS" },
                { v: String(data.defenses), l: data.defenses === 1 ? "VERDEDIGING" : "VERDEDIGINGEN" },
                { v: `#${data.edition}`, l: "EDITIE" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border-2 border-white/15 bg-white/5 px-2 py-3">
                  <p className="pixel text-[15px] text-[#ffc527]">{s.v}</p>
                  <p className="pixel mt-1.5 text-[7px] leading-relaxed opacity-80">{s.l}</p>
                </div>
              ))}
            </div>
            {data.previous && !data.defended && (
              <p className="mt-4 text-sm font-bold opacity-80">
                De wisselbeker gaat van <b>{data.previous.name}</b> naar <b>{w.name}</b>.
              </p>
            )}
            {data.defended && <p className="mt-4 text-sm font-bold opacity-80">{w.name} verdedigt de titel en houdt de wisselbeker!</p>}
            <div className="mt-6 grid w-full gap-2.5">
              <button type="button" onClick={replay} className="pd-btn pd-btn-gold">
                🔄 OPNIEUW BEKIJKEN
              </button>
              <Link href="/smash-cup" className="pd-btn">
                🏆 SMASH CUP HISTORY
              </Link>
              <Link href={`/agenda/${data.nightId}`} className="pd-btn">
                ◀ TERUG NAAR DE AVOND
              </Link>
            </div>
            {auto && <p className="pt-3 text-center text-[11px] font-bold opacity-60">Je kunt de uitreiking later terugkijken via de avond.</p>}
          </div>
        )}

        {scene !== "final" && (
          <div
            className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md gap-2 px-4"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
          >
            <button type="button" onClick={() => setStep(TIMELINE.length - 1)} className="pd-btn flex-1">
              ⏭️ OVERSLAAN
            </button>
            <button type="button" onClick={toggleSound} className="pd-btn flex-1" aria-pressed={sound && ready}>
              {sound && ready ? "🔊 GELUID AAN" : sound ? "🔊 TIK VOOR GELUID" : "🔇 GELUID UIT"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
