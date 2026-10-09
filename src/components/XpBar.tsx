import type { XpInfo } from "@/lib/xp";

/** Level + XP-balk in blokjes, zoals een levensbalk in een oude game. */
export function XpBar({ info, compact }: { info: XpInfo; compact?: boolean }) {
  const blocks = 12;
  const filled = Math.floor((info.into / info.span) * blocks);
  return (
    <div className={compact ? "" : "rounded-xl border-2 border-line bg-ink/[0.04] px-3 py-2.5"}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="pixel text-[11px]">
          LV {info.level} <span className="text-muted">· {info.title.toUpperCase()}</span>
        </span>
        <span className="text-[11px] font-black text-muted">{info.xp} XP</span>
      </div>
      <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`${info.into} van ${info.span} XP naar level ${info.level + 1}`}>
        {Array.from({ length: blocks }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 border-2 border-line ${i < filled ? "bg-green" : "bg-soft"}`}
          />
        ))}
      </div>
      {!compact && (
        <p className="mt-1 text-[11px] font-bold text-muted">
          Nog {info.toNext} XP tot level {info.level + 1}
        </p>
      )}
    </div>
  );
}
