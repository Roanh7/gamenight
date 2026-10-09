"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendTestPush } from "@/app/account/actions";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export async function currentPushState(): Promise<State> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(): Promise<State> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));
  const json = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
  });
  if (error) throw new Error("Opslaan lukte niet");
  return "on";
}

/** Meldingen aan/uit voor dit toestel. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    currentPushState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      setState(await enablePush());
    } catch {
      setNote("Aanzetten lukte niet. Probeer het nog eens.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    const n = await sendTestPush().catch(() => 0);
    setNote(n ? "Testmelding verstuurd! 📬" : "Er ging geen melding uit. Zet ze uit en weer aan.");
    setBusy(false);
  }

  if (state === "loading") return <p className="text-sm text-muted">Even kijken…</p>;
  if (state === "install")
    return (
      <p className="text-sm">
        Meldingen werken op de iPhone alleen als Game Night op je <b>beginscherm</b> staat. Zet de app daar eerst
        neer (deelknop → <i>Zet op beginscherm</i>) en open hem vanaf daar.
      </p>
    );
  if (state === "unsupported") return <p className="text-sm text-muted">Deze browser ondersteunt geen meldingen.</p>;
  if (state === "denied")
    return (
      <p className="text-sm">
        Meldingen zijn geblokkeerd voor Game Night. Op je iPhone zet je ze aan via{" "}
        <b>Instellingen → Meldingen → Game Night</b>.
      </p>
    );

  return (
    <div className="space-y-2">
      {state === "on" ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={test} disabled={busy} className="btn btn-green btn-sm">
            <Bell size={16} strokeWidth={2.5} /> Test
          </button>
          <button type="button" onClick={turnOff} disabled={busy} className="btn btn-secondary btn-sm">
            <BellOff size={16} strokeWidth={2.5} /> Uitzetten
          </button>
        </div>
      ) : (
        <button type="button" onClick={turnOn} disabled={busy} className="btn btn-primary btn-sm w-full">
          <Bell size={16} strokeWidth={2.5} /> {busy ? "Even geduld…" : "Meldingen aanzetten"}
        </button>
      )}
      {note && <p className="text-xs font-bold">{note}</p>}
    </div>
  );
}
