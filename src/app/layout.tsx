import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "@fontsource-variable/nunito";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { getMe } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { getMyActiveNight } from "@/lib/live";
import { ScoreSyncAgent } from "@/components/ScoreSyncAgent";
import { CeremonyListener } from "@/components/CeremonyListener";
import { BOOT_SCRIPT, BootScreen } from "@/components/BootScreen";
import { seasonTheme } from "@/lib/season";

export const metadata: Metadata = {
  title: { default: "Game Night", template: "%s · Game Night" },
  description: "Plan gamenights, stem op games en houd de ranglijst bij met je vrienden.",
  appleWebApp: { capable: true, title: "Game Night", statusBarStyle: "default" },
  // Oudere iPhones kijken alleen naar deze naam om zonder Safari-balken te openen
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#16141f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [me, jar] = await Promise.all([getMe(), cookies()]);
  const theme = jar.get("gn-theme")?.value;
  const live = me ? await getMyActiveNight() : null;
  const liveOff = !!live && jar.get("gn-nav")?.value === `normal:${live.id}`;
  const season = seasonTheme();

  return (
    <html
      lang="nl"
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      data-season={season ?? undefined}
      // Het startscherm-script zet data-boot op <html> vóórdat React start
      suppressHydrationWarning
      style={{ ["--nav-h" as string]: live ? "104px" : "76px" }}
    >
      {me && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        </head>
      )}
      <body className="min-h-dvh antialiased">
        <div className="pixel-sky" aria-hidden />
        {season && (
          <div className="season-layer" aria-hidden>
            <div className="season-bats a hw" />
            <div className="season-bats b hw" />
            <div className="season-pumpkins hw" />
            <div className="season-snow a xm" />
            <div className="season-snow b xm" />
          </div>
        )}
        {me && <BootScreen />}
        {me && (
          <header className="sticky top-0 z-30 border-b-2 border-line bg-cream/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
              <Link href="/" aria-label="Home">
                <Logo />
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/uitleg"
                  aria-label="Uitleg"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-line bg-paper font-black"
                >
                  ?
                </Link>
                <Link href="/account" className="flex items-center gap-2" aria-label="Mijn account">
                  <span className="hidden text-sm font-extrabold sm:inline">{me.profile.username}</span>
                  <Avatar name={me.profile.username} color={me.profile.avatar_color} url={me.profile.avatar_url} emoji={me.profile.avatar_emoji} pixel={me.profile.avatar_pixel} frame={me.profile.avatar_frame} size="sm" />
                </Link>
              </div>
            </div>
          </header>
        )}
        {me && (
          <div className="pt-3 empty:hidden">
            <ScoreSyncAgent />
          </div>
        )}
        <main className={`mx-auto max-w-xl px-4 ${me ? "pb-32 pt-5" : "py-8"}`}>{children}</main>
        {me && <BottomNav live={live} liveOff={liveOff} />}
        {me && <CeremonyListener />}
      </body>
    </html>
  );
}
