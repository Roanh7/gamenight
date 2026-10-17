import type { CardStats, EditionId } from "@/lib/player";
import { EDITIONS } from "@/lib/player";
import { HEX, safeColor } from "@/lib/colors";
import { seasonLabel } from "@/lib/stats";
import { parseAvatar } from "@/lib/avatar";
import { CARD_LAYOUT as L, EDITION_ART, cardArtSvg } from "@/lib/cardArt";

/** Kleuren per editie (ook gebruikt door de PNG en andere plekken). */
export const EDITION_STYLE: Record<EditionId, { text: string; accent: string; shine?: boolean }> = EDITION_ART;

// 1em = 1/16 van de kaartbreedte
const SIZES = { sm: 10, md: 12, lg: 16.5 } as const;

export const CARD_CLIP =
  "polygon(10% 1.1%, 33.75% 1.1%, 37.5% 3.6%, 62.5% 3.6%, 66.25% 1.1%, 90% 1.1%, 98.4% 6.7%, 98.4% 89.3%, 50% 98.9%, 1.6% 89.3%, 1.6% 6.7%)";

export function cardStatList(stats: CardStats) {
  const a = stats.attrs;
  return [
    [a?.win ?? "--", "WIN"],
    [a?.pos ?? "--", "POS"],
    [a?.all ?? "--", "ALL"],
    [a?.vrm ?? "--", "FRM"],
    [stats.games, "GMS"],
    [stats.streak, "STK"],
  ] as const;
}

export function nameSize(name: string) {
  return name.length > 14 ? 0.6 : name.length > 10 ? 0.76 : L.name.size;
}

export function PlayerCard({
  name,
  color,
  emoji,
  config,
  mainIcon,
  nickname,
  edition,
  stats,
  season,
  size = "md",
  locked,
}: {
  name: string;
  color?: string | null;
  emoji?: string | null;
  config?: unknown;
  mainIcon?: string | null;
  nickname: string;
  edition: EditionId;
  stats: CardStats;
  season?: string | null;
  size?: keyof typeof SIZES;
  locked?: boolean;
}) {
  const art = EDITION_ART[edition];
  const pix = parseAvatar(config);
  const em = (n: number) => `${n}em`;
  const list = cardStatList(stats);
  const c = safeColor(color);

  return (
    <div
      className={`pcard relative select-none ${locked ? "pcard-locked" : ""}`}
      style={{ fontSize: SIZES[size], width: em(16), height: em(22.4), color: art.text }}
      role="img"
      aria-label={`Player Card van ${name}: ${stats.ovr ?? "geen"} OVR, ${EDITIONS[edition].name}`}
    >
      <div className="pcard-art absolute inset-0" dangerouslySetInnerHTML={{ __html: cardArtSvg(edition, pix) }} />

      {!pix && (
        <div
          className="absolute flex items-center justify-center"
          style={{ left: em(L.avatar.x + 1), top: em(L.avatar.y + 1.2), width: em(L.avatar.size - 2), height: em(L.avatar.size - 2) }}
          aria-hidden
        >
          <span
            className="flex h-full w-full items-center justify-center leading-none"
            style={{
              fontSize: em(5.4),
              background: emoji ? "transparent" : HEX[c],
              borderRadius: "0.18em",
              border: emoji ? "none" : "0.05em solid #1e1b2b",
              color: "#fff",
            }}
          >
            {emoji ?? <span className="pixel" style={{ fontSize: "0.5em" }}>{name.slice(0, 1).toUpperCase()}</span>}
          </span>
        </div>
      )}

      {/* Holo / glans */}
      {(art.holo || art.shine) && !locked && (
        <div className="pointer-events-none absolute inset-0" style={{ clipPath: CARD_CLIP }} aria-hidden>
          {art.holo && <span className="pcard-holo" />}
          {art.shine && <span className="player-card-shine" />}
        </div>
      )}

      {/* Linkerkolom: OVR, hoofdgame, editie */}
      <div className="absolute flex flex-col items-center" style={{ left: em(L.ovr.x), top: em(L.ovr.y), width: em(3.3) }}>
        <span className="pixel leading-none" style={{ fontSize: em(L.ovr.size), textShadow: "0.06em 0.06em 0 rgba(0,0,0,.18)" }}>
          {stats.ovr ?? "--"}
        </span>
        <span className="pixel leading-none" style={{ fontSize: em(L.ovrLabel.size), marginTop: em(0.35), color: art.accent }}>
          OVR{stats.provisional && stats.ovr !== null ? "*" : ""}
        </span>
        <span className="leading-none" style={{ fontSize: em(L.game.size), marginTop: em(0.5) }} title="Meest gespeelde game">
          {mainIcon ?? "🎲"}
        </span>
        <span
          className="flex items-center justify-center leading-none"
          style={{
            fontSize: em(L.edition.size * 0.62),
            marginTop: em(0.45),
            width: em(1.55),
            height: em(1.55),
            borderRadius: "999px",
            background: "rgba(30,27,43,.85)",
            boxShadow: `0 0 0 0.12em ${art.ribbon}`,
          }}
          title={EDITIONS[edition].name}
        >
          {art.icon}
        </span>
      </div>

      {/* Naam-lint */}
      <div className="absolute inset-x-0 text-center text-white" style={{ top: em(L.ribbon.y), height: em(L.ribbon.h) }}>
        <p className="pixel truncate px-[1.2em] uppercase leading-none" style={{ fontSize: em(nameSize(name)), marginTop: em(nameSize(name) === 1 ? 0.42 : 0.55) }}>
          {name}
        </p>
        <p
          className="absolute inset-x-0 truncate px-[1em] font-black uppercase leading-none tracking-wider"
          style={{ fontSize: em(L.nick.size), top: em((L.nick.y - L.ribbon.y) / L.nick.size), color: art.ribbon }}
        >
          {nickname}
        </p>
      </div>

      {/* Attributen */}
      {[0, 1].map((col) => (
        <dl key={col} className="absolute" style={{ left: em(L.stats.cols[col]), top: em(L.stats.y), width: em(5.2) }}>
          {list.slice(col * 3, col * 3 + 3).map(([v, l]) => (
            <div key={l} className="flex items-baseline" style={{ height: em(L.stats.row) }}>
              <dd className="pixel leading-none" style={{ fontSize: em(L.stats.valueSize), width: "2.4em" }}>
                {v}
              </dd>
              <dt className="font-black leading-none" style={{ fontSize: em(L.stats.labelSize), color: art.accent }}>
                {l}
              </dt>
            </div>
          ))}
        </dl>
      ))}

      {/* Prijzen en voet */}
      <p className="absolute inset-x-0 text-center font-black leading-none" style={{ top: em(L.trophies.y) }}>
        <span style={{ fontSize: em(L.trophies.size), color: stats.trophies > 0 ? art.text : art.accent }}>
          {stats.trophies > 0 ? `🏆 ×${stats.trophies}` : `${stats.winPct}% WINST`}
        </span>
      </p>
      <p className="pixel absolute inset-x-0 text-center uppercase leading-none" style={{ top: em(L.footer.y) }}>
        <span style={{ fontSize: em(L.footer.size), color: art.accent }}>{season ? seasonLabel(season) : EDITIONS[edition].name}</span>
      </p>

      {locked && (
        <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: em(3) }} aria-label="nog niet vrijgespeeld">
          🔒
        </span>
      )}
    </div>
  );
}
