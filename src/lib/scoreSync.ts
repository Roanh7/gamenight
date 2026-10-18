"use client";

/**
 * Veilig opslaan van conceptscores tijdens een potje.
 *
 * - Elke wijziging komt eerst in een wachtrij op dit apparaat (localStorage), zodat niks
 *   verloren gaat als de telefoon op slot gaat, Safari herlaadt of de verbinding wegvalt.
 * - Daarna wordt hij één voor één naar Supabase gestuurd (save_score / save_team_score).
 * - Pas als Supabase de wijziging bevestigt, verdwijnt hij uit de wachtrij.
 * - Elke wijziging heeft een eigen id, dus nog een keer versturen telt nooit dubbel.
 * - "+1/-1" telt gewoon op bij wat een ander invoert; een vaste waarde wordt geweigerd als
 *   iemand anders de cel intussen heeft veranderd (conflict → melding).
 */

import { createClient } from "./supabase/client";

export type Kind = "player" | "team";
export type Cell = { points: number | null; version: number; by?: string | null };
type Op = { id: string; op: "set" | "add"; value: number | null; base: number | null };
type Stored = { kind: Kind; nightId: string; label: string; ops: Record<string, Op[]>; at: number };

export type SyncStatus = "saved" | "saving" | "offline" | "error";
export type Conflict = { key: string; mine: number | null; theirs: number | null; by: string | null };

const PREFIX = "gn-scores-";
const engines = new Map<string, ScoreSync>();
/** Potjes waarvan het scorebord nu open staat (dat bord regelt het opslaan zelf). */
export const activeBoards = new Set<string>();

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
}

function read(matchId: string): Stored | null {
  try {
    const raw = localStorage.getItem(PREFIX + matchId);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** Alle potjes met wijzigingen die nog alleen op dit apparaat staan. */
export function pendingMatches(): { matchId: string; kind: Kind; nightId: string; label: string; count: number }[] {
  const out: { matchId: string; kind: Kind; nightId: string; label: string; count: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const s = read(k.slice(PREFIX.length));
      const count = s ? Object.values(s.ops).reduce((t, l) => t + l.length, 0) : 0;
      if (s && count) out.push({ matchId: k.slice(PREFIX.length), kind: s.kind, nightId: s.nightId, label: s.label, count });
    }
  } catch {}
  return out;
}

export function splitKey(key: string) {
  const i = key.lastIndexOf(":");
  return { who: key.slice(0, i), round: Number(key.slice(i + 1)) };
}

function isNetworkError(e: { code?: string; message?: string } | null) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!e) return false;
  if (e.code) return false; // foutmelding van de database zelf
  return /fetch|network|load failed|timed? ?out|abort/i.test(e.message ?? "");
}

export class ScoreSync {
  readonly matchId: string;
  kind: Kind;
  nightId: string;
  label: string;
  known: Record<string, Cell> = {};
  ops: Record<string, Op[]> = {};
  status: SyncStatus = "saved";
  conflicts: Conflict[] = [];
  lastError: string | null = null;
  closed = false;
  private inflight = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private listeners = new Set<() => void>();
  private client: ReturnType<typeof createClient> | null = null;
  private get supabase() {
    return (this.client ??= createClient());
  }
  private version = 0;

  private constructor(matchId: string, kind: Kind, nightId: string, label: string) {
    this.matchId = matchId;
    this.kind = kind;
    this.nightId = nightId;
    this.label = label;
    const s = read(matchId);
    if (s) this.ops = s.ops ?? {};
    this.status = this.count() ? "saving" : "saved";
  }

  /** Eén gedeelde motor per potje (scorebord en achtergrond gebruiken dezelfde). */
  static get(matchId: string, kind: Kind, nightId: string, label = "") {
    // Op de server nooit delen tussen bezoekers
    if (typeof window === "undefined") return new ScoreSync(matchId, kind, nightId, label);
    let e = engines.get(matchId);
    if (!e) {
      e = new ScoreSync(matchId, kind, nightId, label);
      engines.set(matchId, e);
    }
    if (label) e.label = label;
    return e;
  }

  /** Stand van de server (bij het laden van de pagina of na verversen). Oudere info wint nooit. */
  merge(rows: { key: string; points: number | null; version: number; by?: string | null }[], quiet = false) {
    let changed = false;
    for (const r of rows) {
      const cur = this.known[r.key];
      if (!cur || r.version > cur.version) {
        this.known[r.key] = { points: r.points, version: r.version, by: r.by ?? null };
        changed = true;
      }
    }
    if (changed && !quiet) this.emit();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Telt mee als iemand de stand bekijkt; verandert bij elke wijziging. */
  get snapshot() {
    return this.version;
  }

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  count() {
    return Object.values(this.ops).reduce((t, l) => t + l.length, 0);
  }

  keys() {
    return [...new Set([...Object.keys(this.known), ...Object.keys(this.ops)])];
  }

  /** Wat er op het scherm moet staan: de bevestigde waarde plus alles wat nog onderweg is. */
  value(key: string): number | null {
    let v = this.known[key]?.points ?? null;
    for (const o of this.ops[key] ?? []) v = o.op === "set" ? o.value : (v ?? 0) + (o.value ?? 0);
    return v;
  }

  private persist() {
    try {
      if (this.count()) {
        const s: Stored = { kind: this.kind, nightId: this.nightId, label: this.label, ops: this.ops, at: Date.now() };
        localStorage.setItem(PREFIX + this.matchId, JSON.stringify(s));
      } else localStorage.removeItem(PREFIX + this.matchId);
    } catch {}
  }

  edit(key: string, op: "set" | "add", value: number | null) {
    if (this.closed) return;
    const list = (this.ops[key] ??= []);
    const last = list[list.length - 1];
    const lastFree = last && !(list.length === 1 && this.inflight.has(key));
    if (lastFree && last) {
      // Samenvoegen met de vorige wijziging die nog niet onderweg is
      if (op === "set" && last.op === "add" && list.length === 1) last.base = this.known[key]?.version ?? 0;
      if (op === "set") {
        last.op = "set";
        last.value = value;
      } else last.value = (last.value ?? 0) + (value ?? 0);
      if (last.op === "add" && last.value === 0) list.pop();
    } else {
      // Basis = de versie die je nu ziet; na een eigen wijziging die nog onderweg is: daarop verder bouwen
      const base = op === "set" ? (list.length ? null : (this.known[key]?.version ?? 0)) : null;
      if (!(op === "add" && !value)) list.push({ id: uuid(), op, value, base });
    }
    if (!list.length) delete this.ops[key];
    this.persist();
    this.status = "saving";
    this.emit();
    this.schedule(op === "set" ? 600 : 250);
  }

  schedule(ms = 250) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  /** Stuurt alles wat nog wacht naar Supabase. Geeft true terug als alles bevestigd is. */
  async flush(): Promise<boolean> {
    if (this.running) {
      while (this.running) await new Promise((r) => setTimeout(r, 80));
      return this.count() === 0;
    }
    this.running = true;
    try {
      while (true) {
        const key = Object.keys(this.ops).find((k) => this.ops[k]?.length && !this.inflight.has(k));
        if (!key) break;
        const op = this.ops[key][0];
        this.inflight.add(key);
        const { who, round } = splitKey(key);
        const base = op.base ?? this.known[key]?.version ?? 0;
        const args = {
          p_match: this.matchId,
          p_round: round,
          p_op: op.op,
          p_value: op.value,
          p_base: base,
          p_op_id: op.id,
        };
        const { data, error } =
          this.kind === "player"
            ? await this.supabase.rpc("save_score", { ...args, p_user: who })
            : await this.supabase.rpc("save_team_score", { ...args, p_team: who });
        this.inflight.delete(key);

        if (error) {
          if (isNetworkError(error)) {
            this.status = "offline";
            this.emit();
            this.retryLater();
            return false;
          }
          // Database weigerde (bijv. geen rechten): deze wijziging kan nooit lukken
          this.ops[key].shift();
          if (!this.ops[key].length) delete this.ops[key];
          this.lastError = error.message;
          this.status = "error";
          this.persist();
          this.emit();
          continue;
        }

        const res = data as { status: string; points: number | null; version: number; by?: string | null };
        if (res.status === "closed") {
          this.closed = true;
          this.ops = {};
          this.persist();
          this.emit();
          return true;
        }
        if (res.status === "conflict") {
          this.conflicts.push({ key, mine: this.value(key), theirs: res.points == null ? null : Number(res.points), by: res.by ?? null });
          delete this.ops[key];
          this.known[key] = { points: res.points == null ? null : Number(res.points), version: res.version, by: res.by ?? null };
        } else {
          this.ops[key].shift();
          if (!this.ops[key].length) delete this.ops[key];
          const cur = this.known[key];
          if (!cur || res.version >= cur.version) {
            this.known[key] = { points: res.points == null ? null : Number(res.points), version: res.version };
          }
        }
        this.persist();
        this.emit();
      }
      if (this.status !== "error") this.status = this.count() ? "saving" : "saved";
      this.emit();
      return this.count() === 0;
    } finally {
      this.running = false;
    }
  }

  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryLater() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (typeof document === "undefined" || document.visibilityState === "visible") void this.flush();
    }, 4000);
  }

  /** Haalt de laatste stand op (zodat je ziet wat de co-host invoert). */
  async refresh() {
    const table = this.kind === "player" ? "score_entries" : "team_scores";
    const who = this.kind === "player" ? "user_id" : "team";
    const { data, error } = await this.supabase
      .from(table)
      .select(`${who}, round, points, version, updated_by`)
      .eq("match_id", this.matchId);
    if (error || !data) return;
    this.merge(
      (data as unknown as Record<string, unknown>[]).map((r) => ({
        key: `${r[who]}:${r.round}`,
        points: r.points == null ? null : Number(r.points),
        version: Number(r.version ?? 1),
        by: (r.updated_by as string | null) ?? null,
      })),
    );
  }

  dismissConflicts() {
    this.conflicts = [];
    this.emit();
  }

  clearError() {
    this.lastError = null;
    if (this.status === "error") this.status = this.count() ? "saving" : "saved";
    this.emit();
  }

  /** Alles van dit potje op dit apparaat vergeten (na afronden of bij "alleen winnaar"). */
  discard() {
    this.ops = {};
    this.persist();
    this.status = "saved";
    this.emit();
  }
}

/** Alleen voor tests: alsof de app opnieuw wordt geopend. */
export function __resetEngines() {
  engines.clear();
}
