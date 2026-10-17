"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BEARD_STYLES,
  DEFAULT_AVATAR,
  EYE_STYLES,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  MOUTH_STYLES,
  OUTFITS,
  PALETTE,
  SKIN_TONES,
  randomAvatar,
  type AvatarConfig,
} from "@/lib/avatar";
import { saveAvatar } from "@/app/account/avatar/actions";
import { PixelAvatar } from "./PixelAvatar";

type StyleKey = "hair" | "eyes" | "mouth" | "beard" | "head" | "glasses" | "outfit";
type ColorKey = "skin" | "hairColor" | "headColor" | "cloth" | "bg";

type Section =
  | { kind: "style"; key: StyleKey; title: string; options: Record<string, { label: string }> }
  | { kind: "color"; key: ColorKey; title: string; colors: string[] };

/** Bij deze onderdelen zoomen de voorbeeldjes in op het gezicht. */
const FACE_PARTS: StyleKey[] = ["eyes", "mouth", "beard", "glasses"];

const TABS: { id: string; label: string; sections: Section[] }[] = [
  {
    id: "gezicht",
    label: "🙂 Gezicht",
    sections: [
      { kind: "color", key: "skin", title: "Huidskleur", colors: SKIN_TONES },
      { kind: "style", key: "eyes", title: "Ogen", options: EYE_STYLES },
      { kind: "style", key: "mouth", title: "Mond", options: MOUTH_STYLES },
    ],
  },
  {
    id: "haar",
    label: "💇 Haar",
    sections: [
      { kind: "style", key: "hair", title: "Kapsel", options: HAIR_STYLES },
      { kind: "color", key: "hairColor", title: "Haarkleur (ook je baard)", colors: HAIR_COLORS },
      { kind: "style", key: "beard", title: "Baard", options: BEARD_STYLES },
    ],
  },
  {
    id: "hoofd",
    label: "🧢 Hoofd",
    sections: [
      { kind: "style", key: "head", title: "Op je hoofd", options: HEADWEAR },
      { kind: "color", key: "headColor", title: "Kleur", colors: PALETTE },
      { kind: "style", key: "glasses", title: "Bril", options: GLASSES },
    ],
  },
  {
    id: "kleding",
    label: "👕 Kleding",
    sections: [
      { kind: "style", key: "outfit", title: "Outfit", options: OUTFITS },
      { kind: "color", key: "cloth", title: "Kleur", colors: PALETTE },
    ],
  },
  {
    id: "achtergrond",
    label: "🎨 Achtergrond",
    sections: [{ kind: "color", key: "bg", title: "Achtergrond", colors: PALETTE }],
  },
];

/** De character creator: stel je eigen pixel-poppetje samen. */
export function AvatarMaker({ name, initial }: { name: string; initial: AvatarConfig | null }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR);
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [bump, setBump] = useState(0);

  const set = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) => {
    setMsg(null);
    setCfg((c) => ({ ...c, [k]: v }));
    setBump((b) => b + 1);
  };

  function save(next: AvatarConfig | null) {
    start(async () => {
      const res = await saveAvatar(next ? JSON.stringify(next) : null);
      if (!res.ok) {
        setMsg({ ok: false, text: "Opslaan lukte niet. Probeer het nog eens." });
        return;
      }
      setMsg({ ok: true, text: next ? "Opgeslagen! Iedereen ziet nu je nieuwe avatar." : "Avatar verwijderd." });
      router.refresh();
      if (!next) router.push("/account");
    });
  }

  return (
    <div className="pb-28">
      {/* Voorbeeld */}
      <section className="card mb-4 flex flex-col items-center gap-3 overflow-hidden p-4">
        <div className="relative">
          <span key={bump} className="avatar-pop block h-44 w-44 overflow-hidden rounded-3xl border-[3px] border-line shadow-[0_5px_0_var(--color-night)]">
            <PixelAvatar config={cfg} className="h-full w-full" />
          </span>
        </div>
        <p className="pixel text-xs uppercase">{name}</p>
        <div className="grid w-full max-w-xs grid-cols-2 gap-2">
          <button type="button" onClick={() => { setCfg(randomAvatar()); setBump((b) => b + 1); setMsg(null); }} className="btn btn-yellow btn-sm">
            🎲 Willekeurig
          </button>
          <button type="button" onClick={() => { setCfg(initial ?? DEFAULT_AVATAR); setBump((b) => b + 1); setMsg(null); }} className="btn btn-secondary btn-sm">
            ↩︎ Ongedaan
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`chip shrink-0 px-3 py-1.5 text-sm ${tab === i ? "bg-night text-white" : "bg-paper"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4" role="tabpanel">
        {TABS[tab].sections.map((s) => (
          <section key={s.key} className="card p-3">
            <p className="mb-2 text-sm font-black">{s.title}</p>
            {s.kind === "color" ? (
              <div className="flex flex-wrap gap-2">
                {s.colors.map((hex, i) => {
                  const on = cfg[s.key] === i;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => set(s.key, i)}
                      aria-pressed={on}
                      aria-label={`Kleur ${i + 1}`}
                      className={`h-10 w-10 rounded-xl border-2 border-line ${on ? "ring-4 ring-yellow ring-offset-2 ring-offset-paper" : ""}`}
                      style={{ background: hex }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {Object.entries(s.options).map(([key, o]) => {
                  const on = cfg[s.key] === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set(s.key, key)}
                      aria-pressed={on}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1 ${on ? "border-line bg-yellow" : "border-transparent bg-cream hover:border-line"}`}
                    >
                      <span className="block aspect-square w-full overflow-hidden rounded-lg border-2 border-line">
                        <PixelAvatar
                          config={{ ...cfg, [s.key]: key }}
                          className="h-full w-full"
                          viewBox={FACE_PARTS.includes(s.key) ? "5 6 14 14" : undefined}
                        />
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-black">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      {initial && (
        <button type="button" onClick={() => save(null)} disabled={pending} className="mt-6 w-full text-center text-sm font-bold text-muted underline">
          Avatar verwijderen en terug naar emoji
        </button>
      )}

      {/* Opslaan, altijd in beeld */}
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 px-4">
        <div className="mx-auto max-w-xl space-y-2">
          {msg && (
            <p role="status" className={`rounded-xl border-2 border-line px-3 py-2 text-sm font-bold ${msg.ok ? "bg-green-soft" : "bg-red-soft"}`}>
              {msg.text}
            </p>
          )}
          <button type="button" onClick={() => save(cfg)} disabled={pending} className="btn btn-primary w-full shadow-[0_4px_0_var(--color-night)]">
            {pending ? "Opslaan…" : "💾 Avatar opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
