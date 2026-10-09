"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { currentPushState, enablePush } from "./PushToggle";

/** Kaartje op Home: "Meldingen aanzetten?" (alleen als het kan en je het nog niet deed). */
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("gn-push-prompt") === "weg";
    } catch {}
    if (dismissed) return;
    currentPushState()
      .then((s) => setShow(s === "off"))
      .catch(() => {});
  }, []);

  function close() {
    setShow(false);
    try {
      localStorage.setItem("gn-push-prompt", "weg");
    } catch {}
  }

  async function on() {
    setBusy(true);
    try {
      await enablePush();
    } catch {}
    close();
  }

  if (!show) return null;
  return (
    <div className="card relative mb-4 flex items-center gap-3 bg-yellow-soft p-3 pr-10">
      <span className="text-2xl" aria-hidden>
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">Meldingen aanzetten?</p>
        <p className="text-xs">Dan hoor je het meteen bij een nieuwe gamenight, en een uur van tevoren.</p>
        <button type="button" onClick={on} disabled={busy} className="btn btn-primary btn-sm mt-2">
          {busy ? "Even geduld…" : "Ja, aanzetten"}
        </button>
      </div>
      <button type="button" onClick={close} aria-label="Niet nu" className="absolute right-2 top-2 p-1 text-muted">
        <X size={18} strokeWidth={3} />
      </button>
    </div>
  );
}
