import Link from "next/link";
import { CalendarDays, Trophy, Vote } from "lucide-react";
import { getMe } from "@/lib/supabase/server";
import { Logo, PixelController } from "@/components/Logo";
import { InstallHint } from "@/components/InstallHint";
import { PlayerHub } from "@/components/PlayerHub";

export default async function Home(props: PageProps<"/">) {
  const me = await getMe();
  if (!me) return <Landing />;
  const sp = await props.searchParams;
  return <PlayerHub userId={me.user.id} welcome={sp.welkom === "1"} />;
}

/* ------------------------------------------------------------------ */
/* Niet ingelogd                                                       */
/* ------------------------------------------------------------------ */
function Landing() {
  const steps = [
    {
      icon: CalendarDays,
      color: "bg-blue",
      title: "Plan een avond",
      text: "Prik een datum, kies een host en zie wie er komt.",
    },
    {
      icon: Vote,
      color: "bg-purple",
      title: "Stem op de game",
      text: "Iedereen stemt. Meeste stemmen wint.",
    },
    {
      icon: Trophy,
      color: "bg-yellow",
      title: "Speel & scoor",
      text: "De host telt de punten. De ranglijst doet de rest.",
    },
  ];
  return (
    <div className="mx-auto max-w-sm">
      <section className="pt-6 text-center">
        <Logo size="lg" />
        <p className="mx-auto mt-5 max-w-xs text-lg font-bold leading-snug">
          De agenda en ranglijst voor jullie gamenights.
        </p>
        <p className="pixel blink mt-6 text-[10px] text-red">PRESS START</p>
        <div className="mt-4 grid gap-3">
          <Link href="/registreren" className="btn btn-primary">
            ▶ Account aanmaken
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Inloggen
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <InstallHint />
      </div>

      <section className="mt-8">
        <h2 className="pixel mb-4 text-center text-[11px]">HOE WERKT HET?</h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="card flex items-center gap-4 p-4">
              <span
                className={`${s.color} ${s.color === "bg-yellow" ? "text-night" : "text-white"} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-line`}
              >
                <s.icon size={24} strokeWidth={2.5} />
              </span>
              <div>
                <p className="font-black">
                  <span className="pixel mr-1.5 text-[10px] text-muted">{i + 1}</span>
                  {s.title}
                </p>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/uitleg" className="btn btn-secondary btn-sm mt-4 w-full">
          Lees de volledige uitleg →
        </Link>
      </section>

      <section className="card mt-8 p-5 text-center">
        <PixelController className="mx-auto mb-3 h-8 w-auto" />
        <p className="font-black">Titels, kroontjes en eeuwige roem</p>
        <p className="mt-1 text-sm text-muted">
          Per game een eigen leaderboard. Word jij Kampioen Mario Kart?
        </p>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Alleen voor de vriendengroep. Je hebt een uitnodigingscode nodig.
      </p>
    </div>
  );
}

