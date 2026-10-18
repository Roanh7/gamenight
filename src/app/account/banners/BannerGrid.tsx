import { Lock } from "lucide-react";
import { BANNERS, RARITY, progress, type BannerStats } from "@/lib/banners";
import { Banner, RarityChip } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { equipBanner } from "../actions";

/** Alle banners in een raster: LOCKED, UNLOCKED (met EQUIP) of EQUIPPED ✓. */
export function BannerGrid({ owned: ownedList, equipped, stats }: { owned: string[]; equipped: string; stats: BannerStats }) {
  const owned = new Set(ownedList);
  const list = [...BANNERS].sort((a, b) => RARITY[a.rarity].order - RARITY[b.rarity].order);
  return (
      <div className="grid grid-cols-2 gap-3">
      {list.map((b) => {
        const has = owned.has(b.id);
        const on = equipped === b.id;
        const p = progress(b, stats);
        return (
          <section key={b.id} className={`card flex min-w-0 flex-col p-2 ${on ? "ring-4 ring-yellow" : ""}`}>
            <div className={`rarity-frame r-${b.rarity} relative h-16`}>
              <Banner id={b.id} still locked={!has} />
              {!has && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-line bg-paper text-ink">
                    <Lock size={16} strokeWidth={3} />
                  </span>
                </span>
              )}
            </div>
            <div className="mt-2 flex items-start justify-between gap-1">
              <p className="min-w-0 text-sm font-black leading-tight">
                {b.emoji} {b.name}
              </p>
            </div>
            <div className="mt-1">
              <RarityChip rarity={b.rarity} />
            </div>
            <p className="mt-1.5 flex-1 text-[11px] font-bold leading-snug text-muted">{b.how}</p>
            {!has && p.need > 1 && (
              <div className="mt-1.5">
                <div className="h-2 overflow-hidden rounded-sm border-2 border-line bg-soft">
                  <div className="h-full bg-green" style={{ width: `${Math.round((p.have / p.need) * 100)}%` }} />
                </div>
                <p className="pixel mt-1 text-[8px] text-muted">
                  {p.have}/{p.need}
                </p>
              </div>
            )}
            <div className="mt-2">
              {on ? (
                <p className="pixel rounded-lg border-2 border-line bg-yellow py-2 text-center text-[9px] text-night">EQUIPPED ✓</p>
              ) : has ? (
                <form action={equipBanner}>
                  <input type="hidden" name="banner" value={b.id} />
                  <SubmitButton className="btn btn-primary btn-sm w-full" pendingText="…">
                    EQUIP
                  </SubmitButton>
                </form>
              ) : (
                <p className="pixel rounded-lg border-2 border-dashed border-line/40 py-2 text-center text-[9px] text-muted">LOCKED</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
