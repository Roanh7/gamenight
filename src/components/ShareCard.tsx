"use client";

import { useRef, useState, type ReactNode } from "react";
import { Share } from "lucide-react";

/** Maakt van de kaart op het scherm een plaatje en deelt het via het iPhone-deelmenu. */
export function ShareCard({ children, filename, title, label }: { children: ReactNode; filename: string; title: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    const node = ref.current?.firstElementChild as HTMLElement | null;
    if (!node) return;
    setBusy(true);
    try {
      const { toBlob } = await import("html-to-image");
      const opts = { pixelRatio: 3, cacheBust: true, style: { margin: "0" } };
      await toBlob(node, opts); // Safari heeft soms een eerste ronde nodig voor fonts en plaatjes
      const blob = await toBlob(node, opts);
      if (!blob) throw new Error("geen plaatje");
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert("Delen lukte niet. Maak anders een screenshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div ref={ref} className="flex justify-center">
        {children}
      </div>
      <button type="button" onClick={share} disabled={busy} className="btn btn-green btn-sm w-full max-w-[300px]">
        <Share size={16} strokeWidth={2.5} /> {busy ? "Plaatje maken…" : label}
      </button>
    </div>
  );
}
