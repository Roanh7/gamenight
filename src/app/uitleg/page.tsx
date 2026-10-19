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
  Star,
  Trophy,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { getMe } from "@/lib/supabase/server";
import { XP_RULES } from "@/lib/xp";
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
          className={`${color} ${color === "bg-yellow" ? "text-night" : "text-white"} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-line`}
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
  ["xp", "Levels & XP"],
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
            <li>
              Kun je toch niet? Tik op <b>Afmelden</b>. Wist je meteen al dat je niet kunt? Tik op{" "}
              <b>🙅 Ik kan niet</b>. Zo weet iedereen het, en je afmelding wordt bewaard.
            </li>
            <li>
              <b>📅 My attendance</b> (bovenaan de Agenda): hoeveel avonden je bij was en hoeveel je miste, je
              aanwezigheid in procenten (vanaf het moment dat je lid werd), je huidige en langste reeks en je actiefste
              maand. Je bent <b>aanwezig</b> als je minstens één potje meespeelde, of als de host je in het host
              dashboard op <b>✅ Was er wel</b> zet. Alleen aangemeld of bevestigd zijn telt níet als aanwezig. Bij elke
              afgelopen avond zie je je eigen resultaat (plek, punten, potjes). Daaronder staan de{" "}
              <b>🏆 Most loyal players</b> (vanaf 3 avonden). Dit telt niet voor punten of XP.
            </li>
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
              per speler, per team, of pas na afloop bij geheime rollen.
            </li>
            <li>
              <b>Scores gaan nooit verloren.</b> Elke tik wordt meteen op je telefoon bewaard en daarna naar de server
              gestuurd. Onderaan zie je hoe het ervoor staat: <i>⏳ Bezig met opslaan</i>, <i>✓ Alles opgeslagen</i> (de
              server heeft het echt) of <i>📴 Offline</i> (het staat nog alleen op je telefoon en gaat vanzelf mee zodra
              je weer bereik hebt). Telefoon op slot, per ongeluk naar Home of de app opnieuw geopend? Alles staat er
              nog. Afronden kan pas als alles echt is opgeslagen.
            </li>
            <li>
              Host en co-host kunnen tegelijk scores invoeren. Tikken jullie allebei op +1, dan tellen beide mee. Vullen
              jullie bij dezelfde speler tegelijk een ander getal in, dan krijg je een melding om te checken welke klopt.
            </li>
            <li>
              Tijdens een potje zijn de scores een <b>concept</b>. Pas bij <b>🏁 Afronden</b> wordt de uitslag officieel
              en tellen ranking, XP, winstreeks, de premie op de koploper, records en nieuws mee. Heropen je een potje om een
              foutje te herstellen, dan wordt dat allemaal teruggedraaid en na het opnieuw afronden opnieuw berekend
              (ook de avondsamenvatting).
            </li>
            <li>
              <b>⚡ Alleen winnaar:</b> bij een simpel spel hoef je geen punten te tellen. Kies bovenaan{" "}
              <i>Alleen winnaar</i>, tik de winnaar aan en rond af. De winnaar krijgt de punten van de 1e plek, de rest
              deelt de 2e plek. De app onthoudt per game welke manier je gebruikt.
            </li>
            <li>
              Op <b>🏁 Afronden</b> tikken als het klaar is (de knop staat altijd onderaan in beeld, en je krijgt eerst
              nog een vraag of het klopt). De punten gaan dan naar de ranglijst, en de
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
            seizoenen en <b>All-time</b>. Bij <b>All-time</b> staat de <b>👑 Hall of Champions</b>: alle
            seizoenskampioenen, hun aantal titels en de seizoenen.
          </p>
          <p className="pt-1">
            <b>📜 Afgesloten seizoenen zijn beschermd:</b> een potje blijft altijd bij het seizoen waarin het werd
            gespeeld, ook als het later wordt gecorrigeerd. Iets veranderen aan een afgesloten seizoen (een oud potje
            corrigeren of weggooien, of een oude avond verwijderen) kan alleen de host, na een waarschuwing die laat
            zien wat er verandert en een getypte bevestiging. Iedereen ziet zo&apos;n correctie in het nieuws.
          </p>
          <p className="pt-1">
            <b>🎯 Premie op de koploper:</b> wie dit seizoen alleen bovenaan staat, heeft een premie op zijn hoofd.
            Eindig je in een potje hoger dan de koploper, dan krijg je <b>+{XP_RULES.bounty} XP</b> extra. Je ziet
            op Home, bij Ranking en bij Players op wie de premie staat.
          </p>
          <p id="specialisten" className="scroll-mt-20 pt-1">
            <b>🎮 Game Specialists:</b> naast de punten-ranglijst heeft elke game een eigen ranglijst op{" "}
            <b>winpercentage</b> (bij gelijk: meeste zeges, dan meeste potjes; helemaal gelijk = gedeelde plek). Je staat
            er officieel op vanaf <b>5 potjes</b> van die game; daarvoor zie je 🔒 en hoeveel potjes je nog nodig hebt.
            Bij teams en geheime rollen telt een zege voor iedereen in het winnende team. De nummer 1 van all-time krijgt
            een titel zoals <b>🏆 SMASH MASTER</b>, <b>30 SECONDS KING</b> of <b>WOLVEN SPECIALIST</b>. Puur voor de
            eer: het levert geen punten of XP op. Je vindt het bij <b>Ranking</b>, op de pagina van elke game en bij{" "}
            <b>My game stats</b> op je profiel.
          </p>
          <p id="underdog" className="scroll-mt-20 pt-1">
            <b>🐺 Underdog Bonus:</b> sta je dit seizoen bij de <b>onderste twee</b> van het klassement (met minstens
            4 spelers op de lijst) én sta je ver genoeg achter op de nummer drie van onderen, dan ben je{" "}
            <b>underdog</b>. &quot;Ver genoeg&quot; = minstens 10 punten, of 20% van de punten van die speler als dat
            meer is. Win je dan een potje, dan krijg je <b>+2 competitiepunten extra</b> (geen extra XP). De status
            wordt vastgelegd <b>bij de start van het potje</b>; inhalen tijdens het potje verandert niets. Bij teams
            krijgt elke underdog in het winnende team de bonus. Wordt een uitslag gecorrigeerd, dan gaat de bonus
            vanzelf naar de juiste winnaar; wordt een potje weggegooid, dan verdwijnt de bonus mee. Je ziet de 🐺 bij{" "}
            <b>Ranking</b>, de host ziet hem bij het starten van een potje, en in het <b>Recordboek</b> staan de{" "}
            <b>Underdog Legends</b>.
          </p>
          <p className="pt-1">
            <b>📜 Recordboek:</b> via de knop bij <b>Ranking</b> zie je de records aller tijden: meeste zeges,
            langste winstreeks, beste avond, vaakst MVP, trouwste speler, meeste avonden gehost, de grootste
            reuzendoder, de pechvogel aller tijden, en de hoogste score per game.
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
              <b>🕹️ Player Hub:</b> Home is jouw eigen spelersmenu. Bovenaan je spelerskaart met level, XP, je plek in
              het seizoen en je winstreeks, plus een berichtje dat past bij hoe het gaat (bovenaan? winstreeks? pech?).
              Daaronder vier cijfers: <b>winrate</b> (hoeveel procent van je potjes je won), <b>streak</b> (zoveel op rij
              gewonnen), <b>form</b> (je laatste 5 potjes: groen = gewonnen, rood = niet gewonnen) en <b>MVP</b> (zo vaak
              was je de beste van een avond). Dan de volgende gamenight, je <b>volgende achievement</b> en je{" "}
              <b>rivaal</b>: de speler die dit seizoen het dichtst bij jou staat in punten. Gewoon voor de lol: jullie
              spelen altijd met de hele groep.
            </li>
            <li>
              <b>🎨 Banners:</b> bovenaan je profiel en je spelerskaart staat een pixel-banner. Iedereen heeft meteen zes
              banners: <b>Rookie Fields</b>, Sunset Beach, Neon Arcade, Snowy Peaks, Cherry Blossom en Deep Sea. De rest speel
              je vrij: Midnight Gamer (5 avonden), Inferno (10 zeges), Thunderstorm (3
              op rij), Graveyard (10 keer laatste, troostprijs!), Cosmic Legend (level 10), Dragon&apos;s Lair (250 potjes),
              Royal Champion (seizoenskampioen), Diamond Arena (100 zeges) en Hall of Fame (3 keer seizoenskampioen). Ze
              komen vanzelf vrij, ook voor wat je al eerder deed. Kiezen doe je via <b>🎨 Customize profile</b>. Een
              EPIC, LEGENDARY of MYTHIC banner komt in het nieuws. Alleen voor de looks: geen punten of XP. Wordt een
              uitslag later gecorrigeerd en klopt een banner daardoor niet meer, dan gaat hij weer op slot.
            </li>
            <li>
              <b>🎮 Avatar:</b> via <b>Account → Customize avatar</b> kies je een emoji, bouw je je eigen pixel-personage
              (gezicht, ogen, haar, baard, outfit, accessoires en achtergrond) of neem je een kant-en-klaar personage, zoals
              Shadow Ninja of Royal King. Wisselen is altijd veilig: punten, XP, achievements, banners en je oude emoji
              blijven gewoon bewaard.
            </li>
            <li>
              <b>🖼️ Frames:</b> een rand om je avatar, overal in de app. Classic, Blue Pixel, Green Pixel en No Frame heeft
              iedereen. Vrij te spelen: Inferno (5 zeges), Thunder (3 op rij), Dragon (30 potjes), Diamond (10 zeges),
              Royal Champion (seizoenskampioen), Cosmic (level 10), Graveyard (10 keer laatste) en Hall of Fame (3 keer
              seizoenskampioen). Ook wat je al eerder deed telt mee. Alleen voor de looks.
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
              Op je <b>account</b> (je rondje rechtsboven) zie je je rankings per game en je <b>🏆 trofeekast</b>.
              Bovenin staan je bekers: goud voor elk gewonnen seizoen, zilver voor elke game waarin je #1 staat.
              Daaronder je <b>10 achievements</b>: Eerste zege, Hattrick, Legende, Vaste gast, Allrounder, Gastheer,
              Fotofinish, Reuzendoder (versla de koploper van het seizoen), Seizoenskampioen en Kampioen. Wat je nog
              niet hebt, staat er als donkere schaduw met een vraagteken. Tik op een prijs om te zien wat het is.
              Andere spelers kunnen jouw kast ook bekijken.
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
            <li>
              Je kunt er ook een <b>💬 comment</b> onder zetten. De laatste twee comments zie je meteen; tik op{" "}
              <b>Laad alle comments</b> om de rest te zien. Ook onder een comment kun je met een emoji reageren. Je eigen comment haal je weg met het kruisje.
            </li>
          </ul>
        </Section>

        <Section id="xp" icon={Star} color="bg-yellow" title="10. Levels & XP">
          <p>Naast de ranglijst spaar je <b>XP</b>. Daarvoor hoef je niet te winnen, meedoen telt ook:</p>
          <ul>
            <li>
              <b>+{XP_RULES.played} XP</b> per potje dat je speelt
            </li>
            <li>
              <b>+{XP_RULES.win} XP</b> extra als je wint, <b>+{XP_RULES.second}</b> voor een 2e plek en{" "}
              <b>+{XP_RULES.third}</b> voor een 3e plek
            </li>
            <li>
              <b>+{XP_RULES.night} XP</b> per gamenight waar je bij was (zodra de host hem afsluit)
            </li>
            <li>
              <b>+{XP_RULES.hosted} XP</b> extra als jij de host was
            </li>
            <li>
              <b>+{XP_RULES.bounty} XP</b> premie als je in een potje hoger eindigt dan de koploper van het seizoen
            </li>
          </ul>
          <p className="pt-1">
            Met genoeg XP ga je een <b>level</b> omhoog. Elk level vraagt wat meer XP dan het vorige. Je titel groeit
            mee: Rookie → Speler (LV 3) → Pro (LV 5) → Veteraan (LV 7) → Legende (LV 10) → Grootmeester (LV 15). Je
            level en XP-balk zie je op je profiel, op Home en bij Players.
          </p>
        </Section>

        <Section id="live" icon={Gamepad2} color="bg-red" title="11. Live Game Mode">
          <ul>
            <li>
              Zodra een avond bezig is waar jij bij bent, verandert de menubalk onderaan in een rode <b>livebalk</b>.
              Daarop zie je of je host bent of meekijkt, en ga je met één tik naar <b>Live</b> (lopende potjes, de
              stand van vanavond en de afgeronde potjes), de <b>avond</b> of de <b>ranking</b>. De host heeft in het
              midden een grote knop om een <b>nieuw potje</b> te starten.
            </li>
            <li>
              Bij het scores invoeren zijn de knoppen groot, en staan <b>← Avond</b> en <b>🏁 Afronden</b> altijd
              onderaan. Meekijkers zien de scores live, maar kunnen niks aanpassen.
            </li>
            <li>
              <b>🔁 Rematch:</b> na een potje start de host met één tik hetzelfde spel met dezelfde spelers opnieuw.
              Bij teamspellen blijven de teams staan (je kunt ze nog wisselen). Wil je iets anders spelen? Kies{" "}
              <b>Ander potje kiezen</b>.
            </li>
            <li>
              Liever het gewone menu? Tik op <b>Menu</b>. Met <b>Terug naar live</b> kom je weer terug.
            </li>
            <li>
              <b>🧪 Oefenavond:</b> in de Agenda start je met <b>Oefenen</b> meteen een avond om alles uit te proberen:
              potjes starten, scores invoeren, afronden, heropenen. Niks telt mee voor ranking, XP, records of nieuws, en
              niemand krijgt een melding. Alleen jij ziet de oefenavond. Klaar? Gooi hem weg via het host dashboard.
            </li>
          </ul>
        </Section>

        <Section id="tips" icon={Smartphone} color="bg-teal" title="12. Tips">
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
              <b>🔔 Meldingen:</b> zet ze aan op je account (of via het kaartje op Home). Je krijgt dan een melding bij
              een nieuwe gamenight, als de host je bevestigt, als de datum vaststaat, als de avond begint, als de recap
              klaarstaat, en <b>een uur van tevoren</b>. De host krijgt een melding als iemand wil meedoen, en iedereen krijgt er een als er een nieuwe speler bij komt. Reageert of commentet iemand op een bericht over jou (bijv. jouw zege), dan hoor je dat ook; net als wanneer iemand antwoordt in een gesprek waar jij al in commentte. Op de iPhone
              werkt dit alleen als de app op je beginscherm staat.
            </li>
            <li>
              <b>🌙 Nachtmodus:</b> staat je iPhone op donker, dan wordt de app dat ook, met sterren in plaats van
              wolkjes. Op je account kun je ook zelf kiezen: Auto, Licht of Nacht.
            </li>
            <li>
              <b>🎮 Startscherm:</b> de eerste keer per dag dat je de app opent, start hij op als een spelcomputer.
              Tik op het scherm (<i>PRESS START</i>) om naar binnen te gaan.
            </li>
            <li>
              <b>💣 Aftellen:</b> op Home brandt een lontje richting de volgende avond. Hoe dichterbij, hoe korter
              de lont. Het laatste uur gaat de bom trillen.
            </li>
            <li>
              <b>🎃 Seizoenen:</b> in oktober vliegen er vleermuizen en staan er pompoenen op de heuvels. In december
              sneeuwt het en krijgt iedereen een kerstmutsje.
            </li>
            <li>
              Geen zin in geluidjes? Zet <b>🔊 Geluidjes bij winst</b> uit op je account (dan is ook het opstartgeluidje stil). Dat geldt alleen voor
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
