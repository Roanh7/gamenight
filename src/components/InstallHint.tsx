"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";

const KEY = "gn-install-hint-hidden";

/** Toont op een iPhone (buiten de beginscherm-app) hoe je Game Night als app installeert. */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const standalone =
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;
    let hidden = false;
    try {
      hidden = localStorage.getItem(KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hangt af van het apparaat, pas na laden bekend
    if (isIOS && !standalone && !hidden) setShow(true);
  }, []);

  if (!show) return null;

  function hide() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <section className="card animate-pop relative mb-5 bg-yellow-soft p-4">
      <button
        type="button"
        onClick={hide}
        aria-label="Sluiten"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-yellow"
      >
        <X size={18} strokeWidth={3} />
      </button>
      <div className="flex items-center gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl border-2 border-line" />
        <div>
          <p className="pixel text-[9px] text-red">TIP</p>
          <p className="font-black leading-tight">Zet Game Night op je beginscherm</p>
        </div>
      </div>
      <ol className="mt-3 space-y-2 text-sm font-bold">
        <li className="flex items-center gap-2">
          <span className="pixel w-4 text-[10px]">1</span>
          Tik in Safari op de deelknop
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-line bg-paper text-blue">
            <Share size={15} strokeWidth={2.5} />
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="pixel w-4 text-[10px]">2</span>
          Kies <span className="inline-flex items-center gap-1 rounded-md border-2 border-line bg-paper px-1.5 py-0.5">
            <SquarePlus size={14} strokeWidth={2.5} /> Zet op beginscherm
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="pixel w-4 text-[10px]">3</span>
          Tik rechtsboven op <b className="font-black">Voeg toe</b>
        </li>
      </ol>
      <p className="mt-3 text-xs text-muted">
        Daarna open je Game Night als een gewone app. Je logt er één keer opnieuw in.
      </p>
    </section>
  );
}
