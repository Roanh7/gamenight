"use client";

import { useState, useTransition } from "react";
import { createResetCode } from "../actions";

type Player = { id: string; username: string; email: string; last_sign_in_at: string | null };

/** Lijst met spelers; per speler een eenmalige herstelcode maken. De code is hier maar één keer te zien. */
export function ResetCodes({ players }: { players: Player[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ id: string; code: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const shown = players.filter((p) => (p.username + " " + p.email).toLowerCase().includes(q.trim().toLowerCase()));
  const pretty = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

  function make(p: Player) {
    if (!window.confirm(`Nieuwe herstelcode maken voor ${p.username}? Een eerdere code van ${p.username} vervalt dan.`)) return;
    start(async () => {
      setErr(null);
      setCopied(false);
      const res = await createResetCode(p.id);
      if (res.error || !res.code) setErr(res.error ?? "Mislukt.");
      else setOpen({ id: p.id, code: res.code });
    });
  }

  async function copy(p: Player, code: string) {
    const text = `Hoi ${p.username}! Je herstelcode voor Game Night is ${pretty(code)} (24 uur geldig). Ga naar ${location.origin}/wachtwoord-vergeten, vul je gebruikersnaam (${p.username}), de code en een nieuw wachtwoord in.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <label htmlFor="zoek-speler" className="sr-only">
        Zoek speler
      </label>
      <input id="zoek-speler" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Zoek op naam of e-mail" className="input mb-3" />
      {err && (
        <p role="alert" className="mb-3 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {err}
        </p>
      )}
      <ul className="hub-panel divide-y-2 divide-soft">
        {shown.map((p) => (
          <li key={p.id} className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{p.username}</p>
                <p className="truncate text-xs font-bold text-muted">
                  <span className="select-all">{p.email}</span>
                </p>
                <p className="text-[11px] font-bold text-muted">
                  Laatst ingelogd: {p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "nooit"}
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm shrink-0 px-2.5 text-xs" disabled={pending} onClick={() => make(p)}>
                🔑 CODE
              </button>
            </div>
            {open?.id === p.id && (
              <div className="mt-2 rounded-xl border-2 border-line bg-yellow-soft p-3" role="status">
                <p className="text-xs font-bold">Herstelcode voor {p.username} (24 uur geldig, je ziet hem maar één keer):</p>
                <p className="pixel my-2 select-all text-center text-[20px] tracking-widest">{pretty(open.code)}</p>
                <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => copy(p, open.code)}>
                  {copied ? "✅ Gekopieerd, plak hem in WhatsApp" : "📋 Kopieer bericht voor " + p.username}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
