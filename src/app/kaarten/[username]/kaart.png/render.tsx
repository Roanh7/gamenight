import { ImageResponse } from "next/og";
import { EDITIONS, type CardStats, type EditionId } from "@/lib/player";
import { seasonLabel } from "@/lib/stats";
import { HEX, safeColor } from "@/lib/colors";
import { cardStatList, nameSize } from "@/components/PlayerCard";
import { CARD_LAYOUT as L, EDITION_ART, cardArtSvg } from "@/lib/cardArt";
import { parseAvatar } from "@/lib/avatar";
import type { loadFonts } from "../../../agenda/[id]/recap.png/render";

/** De Player Card als plaatje (1080x1350), om te delen in de groepsapp. */
export function renderCardPng({
  username,
  color,
  emoji,
  config,
  edition,
  stats,
  season,
  nickname,
  mainIcon: icon,
  fonts,
}: {
  username: string;
  color: string | null;
  emoji: string | null;
  config: unknown;
  edition: EditionId;
  stats: CardStats;
  season: string | null;
  nickname: string;
  mainIcon: string | null;
  fonts: Awaited<ReturnType<typeof loadFonts>>;
}) {
  const p = { username, avatar_emoji: emoji, avatar_color: safeColor(color), avatar_config: config };
  const art = EDITION_ART[edition];
  const pix = parseAvatar(p.avatar_config);
  const pixel = { fontFamily: "Pixel" } as const;
  const E = 45; // 1em op een kaart van 720 breed
  const px = (n: number) => n * E;
  const svg = cardArtSvg(edition, pix, { width: 720 });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const list = cardStatList(stats);
  const mainIcon = icon ?? "🎲";
  const abs = (left: number, top: number, extra: Record<string, unknown> = {}) =>
    ({ position: "absolute", left, top, display: "flex", ...extra }) as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16141f",
          fontFamily: "Nunito",
        }}
      >
        <div style={{ position: "relative", width: 720, height: 1008, display: "flex", color: art.text }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={src} width={720} height={1008} style={{ position: "absolute", left: 0, top: 0 }} />
          {!pix && (
            <div
              style={abs(px(L.avatar.x + 1), px(L.avatar.y + 1.2), {
                width: px(L.avatar.size - 2),
                height: px(L.avatar.size - 2),
                alignItems: "center",
                justifyContent: "center",
                fontSize: px(5.4),
                color: "white",
                borderRadius: 40,
                background: p.avatar_emoji ? "transparent" : (HEX[p.avatar_color] ?? HEX.red),
              })}
            >
              {p.avatar_emoji ?? p.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={abs(px(L.ovr.x), px(L.ovr.y), { width: px(3.3), flexDirection: "column", alignItems: "center" })}>
            <div style={{ ...pixel, fontSize: px(L.ovr.size), display: "flex" }}>{String(stats.ovr ?? "--")}</div>
            <div style={{ ...pixel, fontSize: px(L.ovrLabel.size), color: art.accent, marginTop: px(0.35), display: "flex" }}>
              {`OVR${stats.provisional && stats.ovr !== null ? "*" : ""}`}
            </div>
            <div style={{ fontSize: px(L.game.size), marginTop: px(0.5), display: "flex" }}>{mainIcon}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: px(0.45),
                width: px(1.55),
                height: px(1.55),
                borderRadius: 999,
                background: "rgba(30,27,43,.85)",
                border: `5px solid ${art.ribbon}`,
                fontSize: px(L.edition.size * 0.62),
              }}
            >
              {art.icon}
            </div>
          </div>
          <div style={abs(0, px(L.ribbon.y), { width: 720, height: px(L.ribbon.h), flexDirection: "column", alignItems: "center", color: "white" })}>
            <div style={{ ...pixel, fontSize: px(nameSize(p.username)), marginTop: px(nameSize(p.username) === 1 ? 0.42 : 0.55), display: "flex" }}>
              {p.username.toUpperCase()}
            </div>
          </div>
          <div style={abs(0, px(L.nick.y), { width: 720, justifyContent: "center", fontSize: px(L.nick.size), fontWeight: 800, color: art.ribbon, letterSpacing: 2 })}>
            {nickname}
          </div>
          {[0, 1].map((col) => (
            <div key={col} style={abs(px(L.stats.cols[col]), px(L.stats.y), { flexDirection: "column", width: px(5.2) })}>
              {list.slice(col * 3, col * 3 + 3).map(([v, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "flex-end", height: px(L.stats.row) }}>
                  <div style={{ ...pixel, fontSize: px(L.stats.valueSize), width: px(L.stats.valueSize * 2.4), display: "flex" }}>{String(v)}</div>
                  <div style={{ fontSize: px(L.stats.labelSize), fontWeight: 800, color: art.accent, display: "flex" }}>{l}</div>
                </div>
              ))}
            </div>
          ))}
          <div style={abs(0, px(L.trophies.y), { width: 720, justifyContent: "center", fontSize: px(L.trophies.size), fontWeight: 800, color: stats.trophies > 0 ? art.text : art.accent })}>
            {stats.trophies > 0 ? `🏆 ×${stats.trophies}` : `${stats.winPct}% WINST`}
          </div>
          <div style={abs(0, px(L.footer.y), { width: 720, justifyContent: "center", ...pixel, fontSize: px(L.footer.size), color: art.accent })}>
            {(season ? seasonLabel(season) : EDITIONS[edition].name).toUpperCase()}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 50, display: "flex", fontSize: 30, fontWeight: 800, color: "#ffc527" }}>
          GAME NIGHT · PLAYER CARD
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts, headers: { "Cache-Control": "private, max-age=60" } },
  );
}
