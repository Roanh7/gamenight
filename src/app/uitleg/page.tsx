import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  Crown,
  Flag,
  Gamepad2,
  KeyRound,
  Newspaper,
  Shield,
  Smartphone,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { getMe } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Uitleg" };

function Section({
  id,
  icon: Icon,
  color,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-20 p-5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`${color} ${color === "bg-yellow" ? "text-ink" : "text-white"} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-line`}
        >
          <Icon size={20} strokeWidth={2.5} />
        </span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="space-y-2 text-[15px] leading-relaxed [&_b]:font-black [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}

const TOC = [
  ["start", "Beginnen"],
  ["agenda", "Avond plannen"],
  ["stemmen", "Stemmen"],
  ["host", "De host"],
  ["punten", "Punten & ranking"],
  ["games", "Games"],
  ["extra", "Nieuws & titels"],
  ["tips", "Tips"],
];

export default async function UitlegPage() {
  const me = await getMe();
  return (
    <div>
      <PageHeader back="/" kicker="HANDLEIDING" title="Hoe werkt Game Night?" />

      <p className="mb-4 font-bold">
        Game Night is de agenda én ranglijst voor onze gamenights. Plan een avond, stem op wat we
        spelen, en laat de app bijhouden wie de beste is.
      </p>

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Inhoud">
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="chip bg-paper px-3 py-1 text-sm hover:bg-yellow-soft">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        <Section id="start" icon={KeyRound} color="bg-red" title="1. Beginnen">
          <ul>
            <li>
              Maak een account met een <b>spelersnaam</b>, een <b>kleur</b>, je e-mail en een wachtwoord.
            </li>
            <li>
              Je hebt de <b>uitnodigingscode</b> van de groep nodig. Zo komen er geen vreemden in.
            </li>
            <li>Na het aanmelden ben je meteen binnen; je hoeft geen mail te bevestigen.</li>
            <li>
              Onderin zie je de menubalk: <b>Home</b>, <b>Agenda</b>, <b>Ranking</b> en <b>Account</b>.
            </li>
          </ul>
        </Section>

        <Section id="agenda" icon={CalendarDays} color="bg-blue" title="2. Een avond plannen">
          <ul>
            <li>
              Ga naar <b>Agenda → Plan</b>. Kies een naam, datum, tijd, locatie en wie de <b>host</b> is.
            </li>
            <li>
              Kun je erbij zijn? Open de avond en tik op <b>✋ Ik doe mee!</b>
            </li>
            <li>
              Je staat dan op ⏳ <b>aangemeld</b> tot de host je <b>bevestigt</b> (✓). Alleen bevestigde
              spelers kunnen meedoen aan potjes.
            </li>
            <li>Kun je toch niet? Tik op <b>Afmelden</b>.</li>
          </ul>
        </Section>

        <Section id="stemmen" icon={Vote} color="bg-purple" title="3. Stemmen op de game">
          <ul>
            <li>Op de pagina van een avond zie je alle games. Tik op een game om erop te stemmen.</li>
            <li>
              Iedereen heeft <b>één stem</b>. Nog eens tikken trekt je stem in; op een andere game tikken
              verplaatst hem.
            </li>
            <li>
              De game met de <b>meeste stemmen</b> wint (👑). Bij een gelijke stand kiest de host.
            </li>
            <li>Zodra de host de avond start, sluit de stemming.</li>
          </ul>
        </Section>

        <Section id="host" icon={Shield} color="bg-yellow" title="4. De host">
          <p>
            Elke avond heeft één host. Alleen de host ziet de knop <b>🎮 Host dashboard</b>. Daar kan hij:
          </p>
          <ul>
            <li>
              Deelnemers <b>bevestigen</b>, weghalen of zelf iemand toevoegen
            </li>
            <li>
              De avond <b>starten</b>, <b>afsluiten</b> of <b>afgelasten</b>
            </li>
            <li>
              Een <b>potje starten</b>: kies de game en vink aan wie er meedoet
            </li>
            <li>
              Per <b>ronde</b> de punten invoeren met de <b>+ / –</b> knoppen of door een getal te typen.
              Totalen tellen automatisch op en de live stand loopt mee. Alles wordt meteen opgeslagen.
            </li>
            <li>
              Op <b>🏁 Potje afronden</b> tikken als het klaar is. De punten gaan dan naar de ranglijst.
            </li>
            <li>
              Foutje gemaakt? Met <b>Heropen dit potje</b> kun je de scores nog verbeteren.
            </li>
            <li>De host stokje doorgeven kan onder <b>Avond bewerken</b>.</li>
          </ul>
        </Section>

        <Section id="punten" icon={Trophy} color="bg-green" title="5. Punten & ranking">
          <p>Bij het afronden van een potje gebeurt dit:</p>
          <ul>
            <li>
              Alle rondes worden <b>opgeteld</b>. Per game is ingesteld of de <b>hoogste</b> of de{" "}
              <b>laagste</b> score wint (bij golf of een racetijd is laag beter).
            </li>
            <li>
              Iedereen krijgt <b>ranglijstpunten</b> voor zijn plek. Standaard: 1e = 10, 2e = 6, 3e = 4, 4e
              = 2, 5e = 1. Dit kan per game anders zijn.
            </li>
            <li>Sommige games geven ook een <b>bonus</b> gewoon voor het meedoen.</li>
            <li>
              Eindig je gelijk, dan deel je de plek en krijg je dezelfde punten. Bij een{" "}
              <b>gelijke stand bovenaan is er geen winnaar</b> 🤝.
            </li>
          </ul>
          <p className="pt-1">
            Elke game heeft een eigen <b>leaderboard</b>, plus een <b>algemeen klassement</b> over alle
            games. Wie de meeste punten heeft staat bovenaan; bij gelijke punten telt het aantal zeges.
          </p>
        </Section>

        <Section id="games" icon={Gamepad2} color="bg-orange" title="6. Games toevoegen">
          <ul>
            <li>
              Ga naar <b>Ranking → + Game</b>. Kies een naam, icoon en kleur.
            </li>
            <li>
              Stel de <b>scoreregels</b> in: hoogste of laagste score wint, en hoeveel punten elke plek
              oplevert.
            </li>
            <li>
              Schrijf eventueel <b>huisregels</b> op (bijv. &quot;4 races, 150cc&quot;).
            </li>
            <li>
              Op de pagina van een game zie je het leaderboard, de regels, de <b>kampioen</b>, het{" "}
              <b>record</b> en alle eerdere potjes.
            </li>
            <li>Regels aanpassen geldt alleen voor nieuwe potjes; oude punten blijven staan.</li>
          </ul>
        </Section>

        <Section id="extra" icon={Crown} color="bg-pink" title="7. Nieuws, titels & achievements">
          <ul>
            <li>
              <Newspaper size={14} className="mr-1 inline" />
              Op <b>Home</b> staat het <b>nieuws</b>: wie er won, wie stijgt en wie er nieuw #1 is.
            </li>
            <li>
              Sta je #1 in een game, dan krijg je de titel <b>👑 Kampioen [game]</b> op je profiel.
            </li>
            <li>
              Op je <b>Account</b> zie je je rankings per game en je <b>achievements</b>: Eerste zege,
              Hattrick, Legende, Vaste gast, Allrounder, Gastheer, Fotofinish en Kampioen.
            </li>
            <li>Tik op een naam in een ranglijst om het profiel van die speler te bekijken.</li>
          </ul>
        </Section>

        <Section id="tips" icon={Smartphone} color="bg-teal" title="8. Tips">
          <ul>
            <li>
              <b>Zet de app op je beginscherm.</b> iPhone: Safari → deelknop → <i>Zet op beginscherm</i>.
              Android: Chrome → ⋮ → <i>Toevoegen aan startscherm</i>.
            </li>
            <li>Je naam, kleur, bio en wachtwoord pas je aan onder <b>Account</b>.</li>
            <li>
              Laat de site een week niemand open, dan gaat hij even &quot;slapen&quot;. Roan kan hem met één
              klik weer wekken; er gaat niets verloren.
            </li>
          </ul>
        </Section>
      </div>

      <div className="card mt-6 bg-red p-5 text-center text-white">
        <Flag className="mx-auto" size={24} strokeWidth={2.5} />
        <p className="mt-2 text-lg font-black">Klaar om te spelen?</p>
        <Link href={me ? "/agenda" : "/registreren"} className="btn btn-yellow mt-4">
          {me ? "▶ Naar de agenda" : "▶ Account aanmaken"}
        </Link>
      </div>
    </div>
  );
}
