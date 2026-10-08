"use client";

import { useState } from "react";
import { CalendarPlus, Share } from "lucide-react";

/** Deelknop (iPhone-deelmenu, met WhatsApp als terugval) + "Zet in agenda". */
export function NightActions({ nightId, shareText }: { nightId: string; shareText: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/agenda/${nightId}`;
    const text = `${shareText}\n\nMeld je aan en stem op de game 👉`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Game Night", text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // gebruiker sloot het menu
      }
    }
    // Terugval: WhatsApp direct openen
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={share} className="btn btn-green btn-sm">
        <Share size={16} strokeWidth={2.5} /> {copied ? "Link gekopieerd" : "Deel avond"}
      </button>
      <a href={`/agenda/${nightId}/agenda.ics`} className="btn btn-secondary btn-sm">
        <CalendarPlus size={16} strokeWidth={2.5} /> Zet in agenda
      </a>
    </div>
  );
}
