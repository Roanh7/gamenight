"use client";

import { useState } from "react";
import { Share } from "lucide-react";

/** Deelt het recap-plaatje via het iPhone-deelmenu (of opent het als dat niet kan). */
export function RecapShare({ nightId, title }: { nightId: string; title: string }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    const src = `/agenda/${nightId}/recap.png`;
    setBusy(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], "gamenight-recap.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Recap: ${title}` });
      } else {
        window.open(src, "_blank");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") window.open(src, "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={share} disabled={busy} className="btn btn-green btn-sm w-full">
      <Share size={16} strokeWidth={2.5} /> {busy ? "Plaatje maken…" : "Deel recap-plaatje"}
    </button>
  );
}
