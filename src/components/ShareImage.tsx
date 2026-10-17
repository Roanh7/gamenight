"use client";

import { useState } from "react";
import { Share } from "lucide-react";

/** Deelt een plaatje via het iPhone-deelmenu (of opent het als dat niet kan). */
export function ShareImage({ src, filename, title, label }: { src: string; filename: string; title: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else window.open(src, "_blank");
    } catch (e) {
      if ((e as Error).name !== "AbortError") window.open(src, "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={share} disabled={busy} className="btn btn-green btn-sm w-full">
      <Share size={16} strokeWidth={2.5} /> {busy ? "Plaatje maken…" : label}
    </button>
  );
}
