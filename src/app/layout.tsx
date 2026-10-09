import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/nunito";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { getMe } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = {
  title: { default: "Game Night", template: "%s · Game Night" },
  description: "Plan gamenights, stem op games en houd de ranglijst bij met je vrienden.",
  appleWebApp: { capable: true, title: "Game Night", statusBarStyle: "default" },
  // Oudere iPhones kijken alleen naar deze naam om zonder Safari-balken te openen
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();

  return (
    <html lang="nl">
      <body className="min-h-dvh antialiased">
        <div className="pixel-sky" aria-hidden />
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
                  <Avatar name={me.profile.username} color={me.profile.avatar_color} url={me.profile.avatar_url} emoji={me.profile.avatar_emoji} size="sm" />
                </Link>
              </div>
            </div>
          </header>
        )}
        <main className={`mx-auto max-w-xl px-4 ${me ? "pb-32 pt-5" : "py-8"}`}>{children}</main>
        {me && <BottomNav />}
      </body>
    </html>
  );
}
