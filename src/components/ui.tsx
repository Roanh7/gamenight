import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  kicker,
  back,
  action,
}: {
  title: string;
  kicker?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            href={back}
            className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink"
          >
            <ChevronLeft size={16} strokeWidth={3} /> Terug
          </Link>
        )}
        {kicker && <p className="pixel mb-1 text-[10px] uppercase text-red">{kicker}</p>}
        <h1 className="truncate text-2xl font-black leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between">
      <h2 className="pixel text-[11px] uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-5 py-8 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <p className="font-black">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="animate-pop rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold"
    >
      {message}
    </p>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planned: { label: "Gepland", cls: "bg-blue-soft" },
    live: { label: "● Live", cls: "bg-red text-white" },
    finished: { label: "Afgelopen", cls: "bg-soft" },
    cancelled: { label: "Afgelast", cls: "bg-soft line-through" },
  };
  const s = map[status] ?? map.planned;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

export function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? "bg-yellow"
      : rank === 2
        ? "bg-[#d9dde6]"
        : rank === 3
          ? "bg-[#f0b98a]"
          : "bg-paper";
  return (
    <span
      className={`pixel inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-line text-[11px] ${cls}`}
    >
      {rank}
    </span>
  );
}
