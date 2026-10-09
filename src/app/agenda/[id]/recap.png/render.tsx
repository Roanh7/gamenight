import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Recap } from "@/lib/recap";
import { formatDateLong } from "@/lib/format";

const HEX: Record<string, string> = {
  red: "#e4002b",
  blue: "#2f5de0",
  green: "#22a04b",
  yellow: "#ffc527",
  purple: "#7b4fd6",
  orange: "#f5761a",
  pink: "#e6489b",
  teal: "#12a3a0",
};
const INK = "#1e1b2b";
const MEDALS = ["🥇", "🥈", "🥉"];

/** Lettertypes uit /assets (Press Start 2P voor koppen, Nunito voor tekst). */
export async function loadFonts() {
  const [pixel, regular, bold] = await Promise.all(
    ["press-start-2p.woff", "nunito-600.woff", "nunito-800.woff"].map((f) => readFile(join(process.cwd(), "assets", f))),
  );
  return [
    { name: "Pixel", data: pixel, weight: 400 as const, style: "normal" as const },
    { name: "Nunito", data: regular, weight: 600 as const, style: "normal" as const },
    { name: "Nunito", data: bold, weight: 800 as const, style: "normal" as const },
  ];
}

export function renderRecap({
  title,
  startsAt,
  recap,
  fonts,
  name,
  colorOf,
  gameNames,
}: {
  title: string;
  startsAt: string;
  recap: Recap;
  fonts: Awaited<ReturnType<typeof loadFonts>>;
  name: (uid: string | null | undefined) => string;
  colorOf: (uid: string) => string;
  gameNames: string;
}) {
  const color = (uid: string) => HEX[colorOf(uid)] ?? HEX.red;
  const mvpRow = recap.rows.find((r) => r.user_id === recap.mvp);
  const top = recap.rows.slice(0, 6);
  const pixel = { fontFamily: "Pixel" } as const;
  const box = {
    display: "flex",
    background: "#fffdf8",
    border: `5px solid ${INK}`,
    borderRadius: 28,
    boxShadow: `0 10px 0 ${INK}`,
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f1e7",
          padding: 60,
          color: INK,
          fontSize: 34,
          fontFamily: "Nunito",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ ...pixel, fontSize: 30, color: HEX.red, display: "flex" }}>GAME NIGHT</div>
          <div style={{ ...pixel, fontSize: 22, display: "flex", background: HEX.yellow, padding: "12px 18px", borderRadius: 14, border: `4px solid ${INK}` }}>
            RECAP
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginTop: 34, lineHeight: 1.1 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 32, color: "#6e6879", marginTop: 10 }}>
          {formatDateLong(startsAt)} · {recap.matches} {recap.matches === 1 ? "potje" : "potjes"}
        </div>

        {/* MVP */}
        <div style={{ ...box, marginTop: 40, padding: 34, alignItems: "center", background: "#fff3cc" }}>
          <div style={{ display: "flex", fontSize: 96 }}>👑</div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 28 }}>
            <div style={{ ...pixel, fontSize: 22, display: "flex" }}>MVP VAN DE AVOND</div>
            <div style={{ display: "flex", fontSize: 62, fontWeight: 800, marginTop: 8 }}>
              {mvpRow ? name(mvpRow.user_id) : "Gedeelde eerste plek!"}
            </div>
            {mvpRow && (
              <div style={{ display: "flex", fontSize: 30, color: "#6e6879" }}>
                {mvpRow.points} punten · {mvpRow.wins}x gewonnen
              </div>
            )}
          </div>
        </div>

        {/* Stand */}
        <div style={{ ...box, marginTop: 34, flexDirection: "column", padding: "16px 34px" }}>
          {top.map((r, i) => (
            <div
              key={r.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 0",
                borderTop: i ? "3px solid #ebe4d6" : "none",
              }}
            >
              <div style={{ display: "flex", width: 70, fontSize: 40 }}>{MEDALS[i] ?? `${i + 1}.`}</div>
              <div
                style={{
                  display: "flex",
                  width: 54,
                  height: 54,
                  borderRadius: 14,
                  border: `4px solid ${INK}`,
                  background: color(r.user_id),
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {name(r.user_id).slice(0, 1).toUpperCase()}
              </div>
              <div style={{ display: "flex", flex: 1, marginLeft: 20, fontSize: 38, fontWeight: 800 }}>{name(r.user_id)}</div>
              <div style={{ ...pixel, display: "flex", fontSize: 28 }}>{r.points}</div>
            </div>
          ))}
        </div>

        {/* Prijzen */}
        <div style={{ display: "flex", marginTop: 34, gap: 24 }}>
          <div style={{ ...box, flex: 1, flexDirection: "column", padding: 26, background: "#dcf5e3" }}>
            <div style={{ display: "flex", fontSize: 26 }}>🏆 Meeste zeges</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 6 }}>
              {recap.mostWins ? `${name(recap.mostWins.user_id)} (${recap.mostWins.wins})` : "Gedeeld"}
            </div>
          </div>
          <div style={{ ...box, flex: 1, flexDirection: "column", padding: 26, background: "#ffe1e6" }}>
            <div style={{ display: "flex", fontSize: 26 }}>🧂 Pechvogel</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 6 }}>
              {recap.unlucky ? `${name(recap.unlucky.user_id)} (${recap.unlucky.last}x laatst)` : "Niemand!"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", fontSize: 26, color: "#6e6879" }}>🎮 {gameNames}</div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts,
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
