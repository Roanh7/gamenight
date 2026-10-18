"use client";

import { useEffect, useState } from "react";
import { PixelController } from "./Logo";
import { playBoot, soundOn, unlockAudio } from "@/lib/sfx";

const KEY = "gn-boot";

/** Datum in Nederland als 2026-12-04. */
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

/**
 * Draait vóór de eerste weergave (in <head>): zet data-boot op <html> als het startscherm
 * vandaag nog niet getoond is. Zo knippert de app niet eerst even zonder startscherm.
 */
export const BOOT_SCRIPT = `try{var d=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam'}).format(new Date());if(localStorage.getItem('${KEY}')!==d)document.documentElement.setAttribute('data-boot','1')}catch(e){}`;

/** Startscherm zoals een spelcomputer, één keer per dag. Tik om te beginnen. */
export function BootScreen() {
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");

  function start() {
    if (state !== "show") return;
    unlockAudio();
    if (soundOn()) playBoot();
    try {
      localStorage.setItem(KEY, today());
    } catch {}
    setState("leaving");
    window.setTimeout(() => {
      document.documentElement.removeAttribute("data-boot");
      setState("gone");
    }, 950);
  }

  useEffect(() => {
    if (state !== "show") return;
    const onKey = (e: KeyboardEvent) => {
      if (!document.documentElement.hasAttribute("data-boot")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (state === "gone") return null;
  const word = (w: string, offset: number, className = "") => (
    <span className={className}>
      {w.split("").map((ch, i) => (
        <span key={i} className="boot-letter" style={{ ["--i" as string]: i + offset }}>
          {ch}
        </span>
      ))}
    </span>
  );
  return (
    <div
      className={`boot ${state === "leaving" ? "boot-leaving" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Press start: open Game Night"
      onClick={start}
    >
      <PixelController className="boot-pad h-16 w-auto" />
      <h1 className="pixel boot-title">
        {word("GAME", 0)}
        {word("NIGHT", 4, "text-red")}
      </h1>
      <p className="pixel boot-press">PRESS START</p>
      <p className="pixel boot-copy">© 2026 GAME NIGHT · 1-8 PLAYERS</p>
    </div>
  );
}
