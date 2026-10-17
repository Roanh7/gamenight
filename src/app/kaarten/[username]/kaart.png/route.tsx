import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { loadCards } from "@/lib/cards";
import { EDITIONS, type EditionId } from "@/lib/player";
import { seasonLabel } from "@/lib/stats";
import { EDITION_STYLE } from "@/components/PlayerCard";
import { loadFonts } from "../../../agenda/[id]/recap.png/render";

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
const NIGHT = "#1e1b2b";

/** De Player Card als plaatje (1080x1350), om te delen in de groepsapp. */
export async function GET(req: Request, ctx: RouteContext<"/kaarten/[username]/kaart.png">) {
  const { username } = await ctx.params;
  const want = new URL(req.url).searchParams.get("kaart") ?? "";
  const supabase = await createClient();
  const [data, fonts] = await Promise.all([loadCards(supabase), loadFonts()]);
  const p = data.profiles.list.find((x) => x.username.toLowerCase() === decodeURIComponent(username).toLowerCase());
  if (!p) return new Response("Niet gevonden", { status: 404 });
  const { col, nickname, shown } = data.collectionFor(p.id);

  // Gevraagde kaart, als die verdiend is; anders de getoonde kaart
  let edition: EditionId = shown.edition;
  let stats = shown.stats;
  let season: string | null = shown.season;
  if (want.startsWith("season:")) {
    const s = col.seasons.find((x) => `season:${x.season}` === want);
    if (s) {
      edition = s.edition;
      stats = s;
      season = s.season;
    }
  } else if (want in col.earned && col.earned[want as EditionId]) {
    edition = want as EditionId;
    stats = col.current;
    season = null;
  }
  const st = EDITION_STYLE[edition];
  const pixel = { fontFamily: "Pixel" } as const;

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
        <div
          style={{
            width: 720,
            height: 1080,
            display: "flex",
            flexDirection: "column",
            padding: 56,
            background: st.bg,
            color: st.text,
            border: `10px solid ${NIGHT}`,
            borderRadius: 60,
            boxShadow: `0 18px 0 ${NIGHT}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ ...pixel, fontSize: 104, display: "flex" }}>{stats.ovr ?? "--"}</div>
              <div style={{ ...pixel, fontSize: 30, color: st.accent, display: "flex", marginTop: 14 }}>OVR</div>
            </div>
            <div style={{ ...pixel, fontSize: 26, color: st.accent, display: "flex", textAlign: "right", maxWidth: 330 }}>
              {(season ? seasonLabel(season) : EDITIONS[edition].name).toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <div
              style={{
                width: 300,
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 180,
                background: HEX[p.avatar_color] ?? HEX.red,
                border: `10px solid ${NIGHT}`,
                borderRadius: 48,
                color: "white",
              }}
            >
              {p.avatar_emoji ?? p.username.slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div style={{ ...pixel, display: "flex", justifyContent: "center", fontSize: 50, marginTop: 44 }}>
            {p.username.toUpperCase()}
          </div>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 32, fontWeight: 800, color: st.accent, marginTop: 10 }}>
            {nickname}
          </div>
          <div style={{ display: "flex", height: 5, background: st.accent, opacity: 0.5, marginTop: 30 }} />
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 30 }}>
            {(
              [
                [`${stats.winPct}%`, "WIN"],
                [String(stats.games), "GAMES"],
                [String(stats.streak), "STREAK"],
                [String(stats.trophies), "TROPHIES"],
              ] as const
            ).map(([v, l]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ ...pixel, fontSize: 44, display: "flex" }}>{v}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: st.accent, display: "flex", marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", justifyContent: "center", fontSize: 24, fontWeight: 800, color: st.accent }}>
            GAME NIGHT · {EDITIONS[edition].name.toUpperCase()} EDITION
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts, headers: { "Cache-Control": "private, max-age=60" } },
  );
}
