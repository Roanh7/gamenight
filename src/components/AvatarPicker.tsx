"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

const EMOJIS = ["👾", "🎮", "🕹️", "👑", "🔥", "😎", "🤖", "👻", "🐸", "🦊", "🐼", "🦁", "🐙", "🦄", "🍕", "🌮", "⚡", "💎", "🎯", "🃏", "🎲", "🏆", "🚀", "💀"];

/** Profielfoto uploaden (verkleind tot 256px) of een emoji kiezen. */
export function AvatarPicker({
  userId,
  name,
  color,
  url,
  emoji,
}: {
  userId: string;
  name: string;
  color: string;
  url: string | null;
  emoji: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState({ url, emoji });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function save(values: { avatar_url: string | null; avatar_emoji: string | null }) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(values).eq("id", userId);
    if (error) throw new Error("Opslaan lukte niet.");
    setCurrent({ url: values.avatar_url, emoji: values.avatar_emoji });
    router.refresh();
  }

  async function resize(file: File) {
    const bitmap = await createImageBitmap(file);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Vierkant uitsnijden vanuit het midden
    const s = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Foto verwerken lukte niet."))), "image/jpeg", 0.85),
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    start(async () => {
      setError(null);
      try {
        const blob = await resize(file);
        const supabase = createClient();
        const path = `${userId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("avatars").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (error) throw new Error("Uploaden lukte niet. Probeer een andere foto.");
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        await save({ avatar_url: data.publicUrl, avatar_emoji: null });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function pickEmoji(em: string) {
    start(async () => {
      setError(null);
      try {
        await save({ avatar_url: null, avatar_emoji: em });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function reset() {
    start(async () => {
      setError(null);
      try {
        await save({ avatar_url: null, avatar_emoji: null });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div>
      <span className="label">Avatar</span>
      <div className="flex items-center gap-3">
        <Avatar name={name} color={color} url={current.url} emoji={current.emoji} size="lg" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="btn btn-blue btn-sm">
            <Camera size={16} strokeWidth={2.5} /> {pending ? "Bezig…" : "Foto kiezen"}
          </button>
          {(current.url || current.emoji) && (
            <button type="button" onClick={reset} disabled={pending} className="btn btn-secondary btn-sm">
              <RotateCcw size={14} strokeWidth={2.5} /> Letter
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      <p className="mb-1.5 mt-3 text-xs font-bold text-muted">Of kies een emoji:</p>
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            disabled={pending}
            onClick={() => pickEmoji(em)}
            aria-pressed={current.emoji === em}
            className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xl ${
              current.emoji === em ? "border-line bg-yellow" : "border-transparent bg-cream hover:border-line"
            }`}
          >
            {em}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
