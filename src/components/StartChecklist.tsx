"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Share, SquarePlus } from "lucide-react";
import { currentPushState, enablePush } from "./PushToggle";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

const HIDE_KEY = "gn-start-hidden";

type Push = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

/**
 * 🚀 Startlijstje op Home voor wie nog niet alles heeft ingesteld:
 * app op het beginscherm (iPhone), meldingen aan, avatar gekozen, gereageerd op de volgende avond.
 * Verdwijnt vanzelf als alles klaar is, of met "Verberg" (onthouden op dit toestel).
 * Gebruikt alleen bestaande gegevens en de bestaande meldingen-knop; slaat zelf niets op de server op.
 */
export function StartChecklist({
  userId,
  hasAvatar,
  night,
  responded,
}: {
  userId: string;
  hasAvatar: boolean;
  night: { id: string; title: string } | null;
  responded: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [push, setPush] = useState<Push>("loading");
  const [openInstall, setOpenInstall] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshPush = useCallback(() => {
    currentPushState()
      .then((s) => setPush(s))
      .catch(() => setPush("unsupported"));
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let hide = false;
    try {
      hide = localStorage.getItem(HIDE_KEY) === userId;
    } catch {}
    /* eslint-disable react-hooks/set-state-in-effect -- hangt af van het toestel, pas na laden bekend */
    setIos(isIos);
    setInstalled(standalone);
    setHidden(hide);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    refreshPush();
  }, [userId, refreshPush]);

  if (!ready || hidden || push === "loading") return null;

  type Step = { id: string; icon: PixelIconName; title: string; text: string; done: boolean; action?: ReactNode; extra?: ReactNode };
  const steps: Step[] = [];

  if (ios) {
    steps.push({
      id: "install",
      icon: "phone",
      title: "Zet de app op je beginscherm",
      text: installed ? "Staat erop. Je opent Game Night nu als een echte app." : "Dan werkt hij als een echte app, en kun je meldingen krijgen.",
      done: installed,
      action: installed ? undefined : (
        <button type="button" className="btn btn-secondary btn-sm shrink-0 px-2.5 text-xs" aria-expanded={openInstall} onClick={() => setOpenInstall((o) => !o)}>
          {openInstall ? "SLUIT" : "HOE?"}
        </button>
      ),
      extra:
        !installed && openInstall ? (
          <ol className="mt-2 space-y-2 rounded-lg border-2 border-line bg-cream p-2.5 text-sm font-bold">
            <li className="flex flex-wrap items-center gap-2">
              <span className="pixel w-4 text-[10px]">1</span>
              Tik in Safari op de deelknop
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-line bg-paper text-blue">
                <Share size={15} strokeWidth={2.5} />
              </span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="pixel w-4 text-[10px]">2</span>
              Kies
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-line bg-paper px-1.5 py-0.5">
                <SquarePlus size={14} strokeWidth={2.5} /> Zet op beginscherm
              </span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="pixel w-4 text-[10px]">3</span>
              Tik rechtsboven op <b className="font-black">Voeg toe</b>
            </li>
            <li className="text-xs font-bold text-muted">Open daarna de app vanaf je beginscherm en log één keer opnieuw in.</li>
          </ol>
        ) : undefined,
    });
  }

  if (push !== "unsupported") {
    const turnOn = async () => {
      setBusy(true);
      try {
        setPush(await enablePush());
      } catch {
        refreshPush();
      }
      setBusy(false);
    };
    steps.push({
      id: "push",
      icon: "bell",
      title: "Zet meldingen aan",
      text:
        push === "on"
          ? "Staan aan. Je hoort het bij een nieuwe avond en een uur van tevoren."
          : push === "install"
            ? "Kan op de iPhone pas als de app op je beginscherm staat (stap hierboven)."
            : push === "denied"
              ? "Meldingen zijn geblokkeerd. Zet ze aan bij de instellingen van je telefoon voor Game Night."
              : "Dan mis je geen nieuwe gamenight, en krijg je een seintje een uur van tevoren.",
      done: push === "on",
      action:
        push === "off" ? (
          <button type="button" className="btn btn-primary btn-sm shrink-0 px-2.5 text-xs" onClick={turnOn} disabled={busy}>
            {busy ? "…" : "AANZETTEN"}
          </button>
        ) : undefined,
    });
  }

  steps.push({
    id: "avatar",
    icon: "palette",
    title: "Maak je avatar",
    text: hasAvatar ? "Gekozen. Wisselen kan altijd via Customize Player." : "Kies een emoji, bouw een pixel-personage of pak een kant-en-klaar personage.",
    done: hasAvatar,
    action: hasAvatar ? undefined : (
      <Link href="/account/avatar" className="btn btn-primary btn-sm shrink-0 px-2.5 text-xs">
        MAAK ▶
      </Link>
    ),
  });

  if (night) {
    steps.push({
      id: "night",
      icon: "calendar",
      title: "Reageer op de volgende avond",
      text: responded ? `Je hebt gereageerd op ${night.title}.` : `Laat weten of je bij ${night.title} bent: Ik doe mee of Ik kan niet.`,
      done: responded,
      action: responded ? undefined : (
        <Link href={`/agenda/${night.id}`} className="btn btn-primary btn-sm shrink-0 px-2.5 text-xs">
          OPEN ▶
        </Link>
      ),
    });
  }

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(HIDE_KEY, userId);
    } catch {}
  }

  return (
    <section className="hub-panel" style={{ ["--panel" as string]: "var(--color-yellow-soft)" }} aria-label="Startlijstje">
      <div className="hub-panel-head">
        <h2 className="pixel flex items-center gap-1.5 text-[10px]">
          <PixelIcon name="gamepad" size={12} /> GET READY
        </h2>
        <span className="flex items-center gap-2">
          <span className="flex gap-[3px]" role="img" aria-label={`${done} van ${steps.length} stappen klaar`}>
            {steps.map((s) => (
              <span key={s.id} className={`h-2.5 w-4 border-2 border-line ${s.done ? "bg-green" : "bg-paper"}`} />
            ))}
          </span>
          <span className="pixel text-[10px]">
            {done}/{steps.length}
          </span>
        </span>
      </div>
      <ul className="divide-y-2 divide-soft">
        {steps.map((s) => (
          <li key={s.id} className={`px-3 py-2.5 ${s.done ? "start-done" : ""}`}>
            <div className="flex items-center gap-3">
              <span className={`start-box ${s.done ? "is-done" : ""}`} aria-hidden>
                <PixelIcon name={s.done ? "check" : s.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black leading-tight">
                  <span className="sr-only">{s.done ? "Klaar: " : "Nog doen: "}</span>
                  {s.title}
                </p>
                <p className="text-xs font-bold text-muted">{s.text}</p>
              </div>
              {s.action}
            </div>
            {s.extra}
          </li>
        ))}
      </ul>
      <button type="button" onClick={hide} className="hub-panel-foot w-full">
        VERBERG DIT LIJSTJE
      </button>
    </section>
  );
}
