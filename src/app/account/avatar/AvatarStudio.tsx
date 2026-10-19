"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import { Avatar, PixelArt } from "@/components/Avatar";
import { EMOJI_GROUPS } from "@/lib/emojis";
import {
  ACC_BACK,
  ACC_EYES,
  ACC_FACE,
  ACC_HEAD,
  BACKGROUNDS,
  BEARDS,
  DEFAULT_PIXEL,
  EXPRESSIONS,
  EYE_COLORS,
  EYE_SHAPES,
  FACES,
  HAIR_COLORS,
  HAIRS,
  normalizeStyle,
  OUTFIT_COLORS,
  OUTFITS,
  PRESETS,
  randomStyle,
  SKINS,
  type PixelStyle,
} from "@/lib/pixelAvatar";
import { equipFrame, saveAvatar } from "../actions";

export type FrameItem = { id: string; name: string; emoji: string; description: string; owned: boolean; lock: string | null };
type Mode = "emoji" | "pixel" | "preset";
type Key = Exclude<keyof PixelStyle, "v" | "k">;

const TABS = [
  { id: "face", label: "🙂 Face" },
  { id: "eyes", label: "👀 Eyes" },
  { id: "hair", label: "💇 Hair" },
  { id: "beard", label: "🧔 Beard" },
  { id: "outfit", label: "👕 Outfit" },
  { id: "acc", label: "🕶️ Accessories" },
  { id: "bg", label: "🎨 Background" },
] as const;

export function AvatarStudio({
  name,
  color,
  emoji,
  pixel,
  frame,
  frames,
}: {
  name: string;
  color: string;
  emoji: string | null;
  pixel: unknown;
  frame: string;
  frames: FrameItem[];
}) {
  const router = useRouter();
  const saved = useMemo(() => normalizeStyle(pixel), [pixel]);
  const [mode, setMode] = useState<Mode>(saved?.k ?? "emoji");
  const [draft, setDraft] = useState<PixelStyle>(saved?.k === "pixel" ? saved : DEFAULT_PIXEL);
  const [presetId, setPresetId] = useState(saved?.k === "preset" ? saved.id : PRESETS[0].id);
  const [emojiDraft, setEmojiDraft] = useState<string | null>(emoji);
  const [emojiTab, setEmojiTab] = useState(() => Math.max(0, EMOJI_GROUPS.findIndex((g) => emoji && g.emojis.includes(emoji))));
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("face");
  const [equipped, setEquipped] = useState(frame);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const previewPixel = mode === "pixel" ? draft : mode === "preset" ? { v: 1 as const, k: "preset" as const, id: presetId } : null;
  const previewEmoji = mode === "emoji" ? emojiDraft : null;
  const presetName = PRESETS.find((p) => p.id === presetId)?.name;

  const dirty =
    mode === "pixel"
      ? JSON.stringify(saved) !== JSON.stringify(draft)
      : mode === "preset"
        ? !(saved?.k === "preset" && saved.id === presetId)
        : saved !== null || emojiDraft !== emoji;

  const set = (k: Key, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function randomize() {
    setMsg(null);
    if (mode === "pixel") setDraft(randomStyle());
    else if (mode === "preset") setPresetId(PRESETS[Math.floor(Math.random() * PRESETS.length)].id);
    else {
      const all = EMOJI_GROUPS.flatMap((g) => g.emojis);
      const e = all[Math.floor(Math.random() * all.length)];
      setEmojiDraft(e);
      setEmojiTab(Math.max(0, EMOJI_GROUPS.findIndex((g) => g.emojis.includes(e))));
    }
  }

  function save() {
    start(async () => {
      setMsg(null);
      const res =
        mode === "pixel"
          ? await saveAvatar({ mode: "pixel", style: draft })
          : mode === "preset"
            ? await saveAvatar({ mode: "preset", style: { v: 1, k: "preset", id: presetId } })
            : emojiDraft === null
              ? await saveAvatar({ mode: "letter" })
              : emojiDraft === emoji
                ? await saveAvatar({ mode: "back" })
                : await saveAvatar({ mode: "emoji", emoji: emojiDraft });
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: "✅ Opgeslagen! Je nieuwe avatar staat overal in de app." });
        router.refresh();
      }
    });
  }

  function cancel() {
    setMode(saved?.k ?? "emoji");
    setDraft(saved?.k === "pixel" ? saved : DEFAULT_PIXEL);
    if (saved?.k === "preset") setPresetId(saved.id);
    setEmojiDraft(emoji);
    router.push("/account");
  }

  function wear(id: string) {
    start(async () => {
      setMsg(null);
      const res = await equipFrame(id);
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setEquipped(id);
        router.refresh();
      }
    });
  }

  const ZOOM: Key[] = ["face", "expr", "eyeShape", "beard", "accEyes", "accFace"];
  const thumb = (k: Key, id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => set(k, id)}
      aria-pressed={draft[k] === id}
      className={`av-opt ${draft[k] === id ? "is-on" : ""}`}
    >
      <span className="block aspect-square w-full overflow-hidden rounded-md">
        <PixelArt style={{ ...draft, [k]: id }} zoom={ZOOM.includes(k)} />
      </span>
      <span className="mt-1 block truncate text-[10px] font-bold leading-tight">{label}</span>
    </button>
  );
  const swatch = (k: Key, id: string, label: string, c: string) => (
    <button
      key={id}
      type="button"
      onClick={() => set(k, id)}
      aria-pressed={draft[k] === id}
      aria-label={label}
      title={label}
      className={`av-swatch ${draft[k] === id ? "is-on" : ""}`}
      style={{ background: c }}
    />
  );
  const group = (title: string, children: React.ReactNode, swatches = false) => (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-black uppercase text-muted">{title}</p>
      <div className={swatches ? "flex flex-wrap gap-2" : "grid grid-cols-4 gap-1.5 sm:grid-cols-6"}>{children}</div>
    </div>
  );

  return (
    <div className="min-w-0">
      {/* Grote preview */}
      <section className="card mb-3 overflow-hidden">
        <div className="bg-night px-4 pb-4 pt-3 text-center text-white">
          <p className="pixel text-[11px] leading-relaxed text-yellow">🎮 CREATE YOUR CHARACTER</p>
          <div className="mt-3 flex justify-center">
            <Avatar name={name} color={color} emoji={previewEmoji} pixel={previewPixel} frame={equipped} size="hero" />
          </div>
          <p className="mt-2 text-sm font-bold opacity-80">
            {mode === "preset" ? presetName : mode === "pixel" ? "Eigen personage" : emojiDraft ? `Emoji ${emojiDraft}` : "Je letter"}
          </p>
        </div>

        {/* Soort avatar */}
        <div className="grid grid-cols-3 border-t-2 border-line text-center" role="tablist" aria-label="Soort avatar">
          {(
            [
              ["emoji", "😀 Emoji"],
              ["pixel", "🎨 Creator"],
              ["preset", "🦸 Characters"],
            ] as const
          ).map(([m, label], i) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setMsg(null);
              }}
              className={`py-2.5 text-xs font-black ${i > 0 ? "border-l-2 border-line" : ""} ${mode === m ? "bg-yellow text-night" : "bg-paper"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Onderdelen */}
      <section className="card mb-3 p-3">
        {mode === "pixel" && (
          <>
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Onderdelen">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`chip shrink-0 px-3 py-1 text-xs ${tab === t.id ? "bg-night text-white" : "bg-paper"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "face" && (
              <>
                {group("Huidskleur", SKINS.map((o) => swatch("skin", o.id, o.label, o.base)), true)}
                {group("Gezichtsvorm", FACES.map((o) => thumb("face", o.id, o.label)))}
                {group("Uitdrukking", EXPRESSIONS.map((o) => thumb("expr", o.id, o.label)))}
              </>
            )}
            {tab === "eyes" && (
              <>
                {group("Oogkleur", EYE_COLORS.map((o) => swatch("eye", o.id, o.label, o.c)), true)}
                {group("Oogvorm", EYE_SHAPES.map((o) => thumb("eyeShape", o.id, o.label)))}
              </>
            )}
            {tab === "hair" && (
              <>
                {group("Kapsel", HAIRS.map((o) => thumb("hair", o.id, o.label)))}
                {group("Haarkleur", HAIR_COLORS.map((o) => swatch("hairColor", o.id, o.label, o.base)), true)}
              </>
            )}
            {tab === "beard" && (
              <>
                {group("Baard", BEARDS.map((o) => thumb("beard", o.id, o.label)))}
                <p className="text-xs font-bold text-muted">Je baard krijgt dezelfde kleur als je haar.</p>
              </>
            )}
            {tab === "outfit" && (
              <>
                {group("Outfit", OUTFITS.map((o) => thumb("outfit", o.id, o.label)))}
                {group("Kleur", OUTFIT_COLORS.map((o) => swatch("outfitColor", o.id, o.label, o.c)), true)}
              </>
            )}
            {tab === "acc" && (
              <>
                <p className="mb-2 text-xs font-bold text-muted">Eén accessoire per plek, dus niets zit elkaar in de weg.</p>
                {group("Ogen", ACC_EYES.map((o) => thumb("accEyes", o.id, o.label)))}
                {group("Hoofd", ACC_HEAD.map((o) => thumb("accHead", o.id, o.label)))}
                {group("Gezicht", ACC_FACE.map((o) => thumb("accFace", o.id, o.label)))}
                {group("Rug", ACC_BACK.map((o) => thumb("accBack", o.id, o.label)))}
              </>
            )}
            {tab === "bg" && group("Achtergrond", BACKGROUNDS.map((o) => swatch("bg", o.id, o.label, o.c)), true)}
          </>
        )}

        {mode === "preset" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                aria-pressed={presetId === p.id}
                className={`av-opt ${presetId === p.id ? "is-on" : ""}`}
              >
                <span className="mx-auto block aspect-square w-full max-w-[96px] overflow-hidden rounded-md">
                  <PixelArt style={{ v: 1, k: "preset", id: p.id }} />
                </span>
                <span className="mt-1 block truncate text-[11px] font-black">
                  {p.emoji} {p.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {mode === "emoji" && (
          <>
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Emoji-groepen">
              {EMOJI_GROUPS.map((g, i) => (
                <button
                  key={g.label}
                  type="button"
                  role="tab"
                  aria-selected={emojiTab === i}
                  onClick={() => setEmojiTab(i)}
                  className={`chip shrink-0 px-3 py-1 text-xs ${emojiTab === i ? "bg-night text-white" : "bg-paper"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5" role="tabpanel">
              {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmojiDraft(em)}
                  aria-pressed={emojiDraft === em}
                  aria-label={`Kies ${em}`}
                  className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xl ${
                    emojiDraft === em ? "border-line bg-yellow" : "border-transparent bg-cream hover:border-line"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
            {emojiDraft && (
              <button type="button" onClick={() => setEmojiDraft(null)} className="btn btn-secondary btn-sm mt-3">
                ↩ Terug naar letter
              </button>
            )}
          </>
        )}
        <p className="mt-3 text-[11px] font-bold text-muted">
          Wisselen is altijd veilig: je punten, XP, achievements, banners, geschiedenis en frame blijven gewoon staan. Je emoji blijft bewaard.
        </p>
      </section>

      {/* Knoppen */}
      <ActionBar
        top={
          <div className="w-full">
            {msg && (
              <p role="status" className={`mb-2 rounded-xl border-2 border-line px-3 py-1.5 text-center text-xs font-bold shadow ${msg.ok ? "bg-green-soft" : "bg-red-soft"}`}>
                {msg.text}
              </p>
            )}
            <button type="button" onClick={save} disabled={pending || !dirty} className="btn btn-primary w-full whitespace-nowrap">
              💾 {pending ? "BEZIG…" : "SAVE CHARACTER"}
            </button>
          </div>
        }
      >
        <button type="button" onClick={randomize} disabled={pending} className="btn btn-secondary btn-sm flex-1 whitespace-nowrap">
          🎲 RANDOMIZE
        </button>
        <button type="button" onClick={cancel} disabled={pending} className="btn btn-secondary btn-sm flex-1 whitespace-nowrap">
          ✖ CANCEL
        </button>
      </ActionBar>

      {/* Frames */}
      <section id="frames" className="card mb-3 p-3">
        <h2 className="pixel mb-1 text-[11px] leading-relaxed">🖼️ AVATAR FRAMES</h2>
        <p className="mb-3 text-xs font-bold text-muted">
          {frames.filter((f) => f.owned).length} van {frames.length} beschikbaar. Alleen voor de looks, je draagt er één tegelijk.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {frames.map((f) => {
            const on = equipped === f.id;
            return (
              <button
                key={f.id}
                type="button"
                disabled={!f.owned || pending || on}
                onClick={() => wear(f.id)}
                aria-pressed={on}
                className={`av-frame ${on ? "is-on" : ""} ${f.owned ? "" : "is-locked"}`}
              >
                <span className="flex justify-center">
                  <Avatar name={name} color={color} emoji={previewEmoji} pixel={previewPixel} frame={f.id} size="lg" />
                </span>
                <span className="mt-1.5 block text-xs font-black">
                  {f.emoji} {f.name}
                </span>
                {f.owned ? (
                  <span className="mt-0.5 block text-[10px] font-bold text-muted">{on ? "✅ EQUIPPED" : "Tik om te dragen"}</span>
                ) : (
                  <span className="mt-0.5 block text-[10px] font-bold leading-snug text-muted">{f.lock}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
