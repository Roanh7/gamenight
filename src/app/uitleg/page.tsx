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
  Users,
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
  ["stemmen", "Welke games?"],
  ["host", "De host"],
  ["recap", "Recap"],
  ["soorten", "Soorten spellen"],
  ["punten", "Punten & ranking"],
  ["games", "Games"],
  ["extra", "Players & nieuws"],
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
              Onderin zie je de menubalk: <b>Home</b>, <b>Agenda</b>, <b>Games</b>, <b>Players</b> en{" "}
              <b>Ranking</b>. Je eigen account open je via je rondje rechtsboven.
            </li>
          </ul>
        </Section>

        <Section id="agenda" icon={CalendarDays} color="bg-blue" title="2. Een avond plannen">
          <ul>
            <li>
              Ga naar <b>Agenda → Plan</b>. Kies een naam, datum, tijd, locatie en wie de <b>host</b> is.
            </li>
            <li>
              Weet je nog niet wanneer? Kies <b>📅 Datumprikker</b> en geef 2 tot 5 momenten op. Iedereen tikt op
              de avond aan wanneer hij kan; de populairste datum krijgt een 👑. De planner of host tikt daarna op{" "}
              <b>Kies deze</b> en dan staat de datum vast.
            </li>
            <li>
              Kun je erbij zijn? Open de avond en tik op <b>✋ Ik doe mee!</b>
            </li>
            <li>
              Je staat dan op ⏳ <b>aangemeld</b> tot de host je <b>bevestigt</b> (✓). Alleen bevestigde
              spelers kunnen meedoen aan potjes.
            </li>
            <li>Kun je toch niet? Tik op <b>Afmelden</b>.</li>
            <li>
              <b>Iets veranderen?</b> De host, co-host en wie de avond gepland heeft zien op de avond de knop{" "}
              <b>✏️ Avond bewerken</b>. Daar pas je de naam, datum, tijd, locatie, host, co-host, games en notities
              aan. Alles wat er al was (aanmeldingen, stemmen, potjes) blijft gewoon staan.
            </li>
            <li>
              Met <b>Deel avond</b> stuur je de avond direct door in de groepsapp, en met{" "}
              <b>Zet in agenda</b> komt hij in je iPhone-agenda, met een herinnering 2 uur van tevoren.
            </li>
          </ul>
        </Section>

        <Section id="stemmen" icon={Vote} color="bg-purple" title="3. Welke games spelen we?">
          <p>Op een avond spelen jullie meestal meerdere games. Bij het plannen kies je hoe die gekozen worden:</p>
          <ul>
            <li>
              <b>Iedereen stemt:</b> tik op de avond alle games aan waar je zin in hebt. Je mag op zoveel games
              stemmen als je wilt; nog eens tikken trekt je stem in. De populairste games staan bovenaan (👑) en
              die worden gespeeld.
            </li>
            <li>
              <b>Vaste games:</b> de planner kiest zelf welke games er gespeeld worden. Dan wordt er niet gestemd en
              zie je op de avond de <b>games van vanavond</b>.
            </li>
            <li>Zodra de host de avond start, sluit de stemming.</li>
            <li>
              <b>De volgorde maakt niet uit.</b> Bij <b>Nieuw potje starten</b> tikt de host gewoon de game aan die
              jullie nu gaan spelen. Al gespeelde games krijgen een ✓.
            </li>
            <li>
              <b>Halverwege toch nog een andere game?</b> Er hoeft niks opnieuw. De host kiest in het host dashboard
              bij <b>➕ Nog een game erbij voor vanavond</b> een game en tikt op <b>Voeg toe</b>. Staat de game nog
              niet in de app, tik dan op <b>Maak hem nu aan</b>: na het opslaan ben je meteen terug bij de avond, met
              de nieuwe game klaargezet.
            </li>
          </ul>
        </Section>

        <Section id="host" icon={Shield} color="bg-yellow" title="4. De host">
          <p>
            Elke avond heeft één host, en eventueel een <b>co-host</b>. Alleen zij zien de knop{" "}
            <b>🎮 Host dashboard</b>. Daar kunnen ze:
          </p>
          <ul>
            <li>
              Deelnemers <b>bevestigen</b>, weghalen of zelf iemand toevoegen
            </li>
            <li>
              De avond <b>starten</b>, <b>afsluiten</b> of <b>afgelasten</b>
            </li>
            <li>
              Een <b>potje starten</b>: tik de game aan die jullie nu spelen en vink aan wie er meedoet. Ook halverwege de avond een game <b>erbij zetten</b>
            </li>
            <li>
              De score bijhouden. Hoe dat gaat hangt af van de <a href="#soorten" className="underline">soort spel</a>:
              per speler, per team, of pas na afloop bij geheime rollen. Alles wordt meteen opgeslagen.
            </li>
            <li>
              Op <b>🏁 Potje afronden</b> tikken als het klaar is. De punten gaan dan naar de ranglijst, en de
              winnaar krijgt confetti en een overwinningsdeuntje 🎉.
            </li>
            <li>
              Foutje gemaakt? Met <b>Heropen dit potje</b> kun je de scores nog verbeteren.
            </li>
            <li>
              Een <b>co-host</b> aanwijzen: tik bij een deelnemer op <b>Co-host</b>. Die kan precies hetzelfde als
              de host, handig als jij zelf meespeelt of even weg moet.
            </li>
            <li>
              Is de host er niet (of zijn telefoon is leeg)? Elke bevestigde speler kan op de avond op{" "}
              <b>🎮 Host overnemen</b> tikken. De oude host wordt dan co-host.
            </li>
            <li>
              Na het laatste potje tikt de host op <b>Avond afsluiten</b>. Dan verschijnt de{" "}
              <a href="#recap" className="underline">recap</a>.
            </li>
            <li>
              De rest kijkt <b>live mee</b>: op de pagina van de avond zie je tijdens een potje de tussenstand,
              die zichzelf elke paar seconden ververst.
            </li>
          </ul>
        </Section>

        <Section id="recap" icon={Flag} color="bg-red" title="5. De recap">
          <ul>
            <li>
              Zodra de host de avond afsluit, maakt de app een <b>🏁 recap</b>: de <b>MVP</b> van de avond (wie de
              meeste punten pakte), de stand van de avond, wie de <b>meeste zeges</b> had en de{" "}
              <b>🧂 pechvogel</b> (het vaakst laatst).
            </li>
            <li>Je ziet de recap op de pagina van de avond, en hij komt automatisch in het nieuws.</li>
            <li>
              Met <b>Deel recap-plaatje</b> maak je er een plaatje van om in de groepsapp te gooien.
            </li>
          </ul>
        </Section>

        <Section id="soorten" icon={Users} color="bg-pink" title="6. Soorten spellen">
          <p>Elke game is een van deze drie soorten. Dat kies je bij het toevoegen of bewerken van de game.</p>
          <div className="space-y-3 pt-1">
            <div className="rounded-xl border-2 border-line bg-blue-soft p-3">
              <p className="font-black">🏆 Ieder voor zich</p>
              <p className="text-sm">bijv. Smash, Paco, Mario Kart</p>
              <ul className="mt-1.5">
                <li>De host voert per ronde de punten van elke speler in, met + / – of door te typen.</li>
                <li>De totalen tellen vanzelf op; de rest kijkt live mee.</li>
                <li>Je krijgt ranglijstpunten voor je eindplek.</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-line bg-green-soft p-3">
              <p className="font-black">👥 Teams</p>
              <p className="text-sm">bijv. 30 seconds, Pictionary</p>
              <ul className="mt-1.5">
                <li>
                  Bij de start verdeelt de host de spelers over de teams, zelf of met <b>Willekeurig</b>.
                </li>
                <li>De host voert per ronde de score per team in; de rest kijkt live mee.</li>
                <li>
                  Iedereen in het winnende team krijgt de punten van de 1e plek, het tweede team die van de 2e
                  plek, enzovoort.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-line bg-purple-soft p-3">
              <p className="font-black">🎭 Geheime rollen</p>
              <p className="text-sm">bijv. Weerwolven, Secret Hitler, Undercover</p>
              <ul className="mt-1.5">
                <li>Tijdens het spel vult de host niks in. Rollen blijven geheim.</li>
                <li>
                  Na afloop tikt de host per speler de rol aan (bijv. Dorp of Weerwolf) en kiest hij welk team won.
                </li>
                <li>
                  Iedereen in het winnende team krijgt de punten van dat team. Het kleine, lastige team levert meer
                  op. Wie verliest krijgt alleen de meedoen-bonus.
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="punten" icon={Trophy} color="bg-green" title="7. Punten & ranking">
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
            <li>Bij teams en geheime rollen krijgt iedereen in hetzelfde team dezelfde punten en zege.</li>
          </ul>
          <p className="pt-1">
            Elke game heeft een eigen <b>leaderboard</b>, plus een <b>algemeen klassement</b> over alle
            games. Wie de meeste punten heeft staat bovenaan; bij gelijke punten telt het aantal zeges.
          </p>
          <p className="pt-1">
            <b>Seizoenen:</b> elk kwartaal begint een nieuw seizoen (jan–mrt, apr–jun, jul–sep, okt–dec). Wie
            aan het eind van een seizoen alleen bovenaan staat, krijgt voor altijd de titel{" "}
            <b>🏆 Seizoenskampioen</b>. Onder <b>Ranking</b> kun je wisselen tussen het huidige seizoen, eerdere
            seizoenen en <b>All-time</b>.
          </p>
        </Section>

        <Section id="games" icon={Gamepad2} color="bg-orange" title="8. Games">
          <ul>
            <li>
              Onder <b>Games</b> zie je alle spellen: welke soort, voor hoeveel spelers, hoe vaak gespeeld en wie
              de kampioen is 👑.
            </li>
            <li>
              Nieuwe game? Tik op <b>Games → + Game</b>. Kies een naam, icoon, kleur en de{" "}
              <a href="#soorten" className="underline">soort spel</a>.
            </li>
            <li>
              Stel de <b>scoreregels</b> in: hoogste of laagste score wint en hoeveel punten elke plek oplevert. Bij
              teams geef je de teamnamen op; bij geheime rollen de teams of rollen met hun punten.
            </li>
            <li>
              Schrijf eventueel <b>huisregels</b> op (bijv. &quot;4 races, 150cc&quot;).
            </li>
            <li>
              Op de pagina van een game zie je het leaderboard, de regels, de <b>kampioen</b>, het{" "}
              <b>record</b> en alle eerdere potjes.
            </li>
            <li>
              Aanpassen kan via het potloodje op de pagina van de game. Dat geldt alleen voor nieuwe potjes; oude
              punten blijven staan.
            </li>
          </ul>
        </Section>

        <Section id="extra" icon={Crown} color="bg-purple" title="9. Players, nieuws & titels">
          <ul>
            <li>
              Onder <b>Players</b> staan alle spelers, op volgorde van de stand van dit seizoen. Tik op iemand om
              zijn profiel te zien.
            </li>
            <li>
              <Newspaper size={14} className="mr-1 inline" />
              Op <b>Home</b> staan de 4 nieuwste berichten: wie er won, wie stijgt en wie er nieuw #1 is. Via{" "}
              <b>Alle nieuws →</b> zie je de rest.
            </li>
            <li>
              Sta je #1 in een game, dan krijg je de titel <b>👑 Kampioen [game]</b> op je profiel.
            </li>
            <li>
              Op je <b>account</b> (je rondje rechtsboven) zie je je rankings per game en je{" "}
              <b>achievements</b>: Eerste zege,
              Hattrick, Legende, Vaste gast, Allrounder, Gastheer, Fotofinish, Seizoenskampioen en Kampioen.
            </li>
            <li>
              Op het profiel van een ander zie je jullie <b>onderlinge stand</b>: hoe vaak jij hoger eindigde dan
              hij, ook per game.
            </li>
            <li>Op je eigen account staat een overzicht van al je onderlinge standen.</li>
            <li>
              Onder elk nieuwsbericht kun je <b>reageren</b> met een emoji (🔥 😂 👏 🧂 💀 👑). Tik op het
              smiley-knopje; nog eens tikken op je emoji haalt hem weg.
            </li>
          </ul>
        </Section>

        <Section id="tips" icon={Smartphone} color="bg-teal" title="10. Tips">
          <ul>
            <li>
              <b>Zet de app op je beginscherm.</b> Open de site in Safari, tik op de deelknop (vierkantje met
              pijltje omhoog), kies <i>Zet op beginscherm</i> en tik op <i>Voeg toe</i>. Je krijgt dan het
              Game Night-icoon en de app opent zonder Safari-balken. Log daarna één keer opnieuw in.
            </li>
            <li>
              Je naam, kleur, bio en wachtwoord pas je aan via je <b>rondje rechtsboven</b>. Daar kies je ook je{" "}
              <b>avatar</b>: een emoji, of gewoon je letter.
            </li>
            <li>
              Geen zin in geluidjes? Zet <b>🔊 Geluidjes bij winst</b> uit op je account. Dat geldt alleen voor
              jouw telefoon.
            </li>
            <li>
              Rechtsboven zit ook het <b>?</b>-knopje: dat brengt je altijd terug naar deze uitleg.
            </li>
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
