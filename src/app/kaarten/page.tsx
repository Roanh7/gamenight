import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getMe } from "@/lib/supabase/server";
import { loadCards } from "@/lib/cards";
import { EDITIONS, EDITION_ORDER, OVR_WEIGHTS, PROVISIONAL_BELOW } from "@/lib/player";
import { seasonLabel } from "@/lib/stats";
import { PlayerCard } from "@/components/PlayerCard";
import { ShareCard } from "@/components/ShareCard";
import { CARD_STYLES, safeStyle } from "@/lib/cardStyles";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, SectionTitle } from "@/components/ui";
import { setCardStyle, setFavoriteCard } from "./actions";

export const metadata: Metadata = { title: "Player Cards" };

export default async function CardsPage(props: PageProps<"/kaarten">) {
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const data = await loadCards(supabase);
  const tab = sp.tab === "album" ? "album" : "mijn";
  const mine = data.collectionFor(me.user.id);
  const fav = me.profile.favorite_card;
  const style = safeStyle(me.profile.card_style);
  const currentKey = mine.shown.kind === "season" ? `season:${mine.shown.season}` : mine.shown.edition;

  const Tabs = (
    <div className="mb-4 grid grid-cols-2 gap-2">
      <Link href="/kaarten" className={`btn btn-sm ${tab === "mijn" ? "btn-yellow" : "btn-secondary"}`}>
        🃏 Mijn kaarten
      </Link>
      <Link href="/kaarten?tab=album" className={`btn btn-sm ${tab === "album" ? "btn-yellow" : "btn-secondary"}`}>
        📒 Alle spelers
      </Link>
    </div>
  );

  if (tab === "album") {
    const everyone = data.profiles.list.map((p) => ({ p, c: data.collectionFor(p.id) }));
    everyone.sort((a, b) => (b.c.col.current.ovr ?? 0) - (a.c.col.current.ovr ?? 0));
    return (
      <div>
        <PageHeader back="/" kicker="PLAYER CARDS" title="Het album" />
        {Tabs}
        <form action="/kaarten/vergelijk" className="card mb-4 space-y-2 p-3">
          <p className="text-sm font-black">⚔️ Vergelijk twee spelers</p>
          <div className="flex items-center gap-2">
            <select name="a" defaultValue={me.profile.username} className="input min-w-0 flex-1" aria-label="Speler 1">
              {data.profiles.list.map((p) => (
                <option key={p.id} value={p.username}>
                  {p.username}
                </option>
              ))}
            </select>
            <span className="pixel text-[10px]">VS</span>
            <select name="b" className="input min-w-0 flex-1" aria-label="Speler 2">
              {data.profiles.list
                .filter((p) => p.id !== me.user.id)
                .map((p) => (
                  <option key={p.id} value={p.username}>
                    {p.username}
                  </option>
                ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm w-full">
            Vergelijk
          </button>
        </form>
        <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-3">
          {everyone.map(({ p, c }) => (
            <li key={p.id}>
              <Link href={p.id === me.user.id ? "/kaarten" : `/kaarten/${p.username}`} className="block active:translate-y-[2px]">
                <PlayerCard card={data.view(p.id)} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { col, nickname } = mine;
  return (
    <div>
      <PageHeader back="/" kicker="PLAYER CARDS" title="Mijn kaarten" />
      {Tabs}

      <section className="card flex flex-col items-center gap-3 p-4">
        <ShareCard filename="gamenight-kaart.png" title={`Player Card van ${me.profile.username}`} label="Deel mijn kaart">
          <PlayerCard card={data.view(me.user.id)} size="lg" />
        </ShareCard>
        <p className="text-center text-xs font-bold text-muted">
          Dit is de kaart die anderen van je zien.{" "}
          {fav ? "Je hebt hem zelf gekozen." : "Kies hieronder zelf welke kaart je wilt laten zien."}
        </p>
      </section>

      <SectionTitle>Kaartstijl</SectionTitle>
      <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4">
        {CARD_STYLES.map((st) => (
          <li key={st.id} className="flex flex-col items-center gap-1.5">
            <PlayerCard card={data.view(me.user.id, { style: st.id })} size="sm" />
            <p className="text-sm font-black">{st.name}</p>
            {style === st.id ? (
              <span className="chip bg-green-soft">✓ Gekozen</span>
            ) : (
              <form action={setCardStyle}>
                <input type="hidden" name="style" value={st.id} />
                <SubmitButton className="btn btn-secondary btn-sm" pendingText="…">
                  Kies deze
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>

      <SectionTitle>Edities</SectionTitle>
      <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-3">
        {EDITION_ORDER.map((e) => {
          const earned = col.earned[e];
          const active = currentKey === e;
          return (
            <li key={e} className="flex flex-col items-center gap-1.5">
              <PlayerCard card={data.view(me.user.id, { edition: e, stats: col.current, season: null })} size="sm" locked={!earned} />
              {earned ? (
                active ? (
                  <span className="chip bg-green-soft">✓ Getoond</span>
                ) : (
                  <form action={setFavoriteCard}>
                    <input type="hidden" name="card" value={e} />
                    <SubmitButton className="btn btn-secondary btn-sm" pendingText="…">
                      ⭐ Toon deze
                    </SubmitButton>
                  </form>
                )
              ) : (
                <p className="max-w-[132px] text-center text-[11px] font-bold text-muted">{EDITIONS[e].how}</p>
              )}
            </li>
          );
        })}
      </ul>

      <SectionTitle>Seizoenskaarten</SectionTitle>
      {col.seasons.length ? (
        <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-3">
          {col.seasons.map((s) => {
            const key = `season:${s.season}`;
            return (
              <li key={s.season} className="flex flex-col items-center gap-1.5">
                <PlayerCard
                  card={data.view(me.user.id, {
                    edition: s.edition,
                    stats: s,
                    season: s.season,
                    nickname: s.rank ? `#${s.rank} IN ${seasonLabel(s.season).toUpperCase()}` : nickname,
                  })}
                  size="sm"
                />
                {currentKey === key ? (
                  <span className="chip bg-green-soft">✓ Getoond</span>
                ) : (
                  <form action={setFavoriteCard}>
                    <input type="hidden" name="card" value={key} />
                    <SubmitButton className="btn btn-secondary btn-sm" pendingText="…">
                      ⭐ Toon deze
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card p-4 text-sm text-muted">
          Na elk afgelopen seizoen krijg je hier een kaart met je cijfers van dat seizoen. Die blijft voor altijd in je
          verzameling.
        </p>
      )}

      <SectionTitle>Hoe werkt de OVR?</SectionTitle>
      <section className="card space-y-2 p-4 text-sm">
        <p>
          Je <b>OVR</b> (40–99) laat zien hoe goed je speelt. Hij staat los van de ranking en verandert na elk potje.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Winpercentage: {OVR_WEIGHTS.win * 100}%</li>
          <li>Gemiddelde eindpositie: {OVR_WEIGHTS.position * 100}%</li>
          <li>Prestaties in verschillende games: {OVR_WEIGHTS.versatility * 100}%</li>
          <li>Recente vorm (laatste 10 potjes): {OVR_WEIGHTS.form * 100}%</li>
        </ul>
        <p>
          Teamspellen tellen voor 75% mee. Met minder dan {PROVISIONAL_BELOW} potjes is je OVR nog <b>voorlopig</b> en
          ligt hij dichter bij het midden, zodat twee gelukkige zeges je niet meteen 99 maken.
        </p>
      </section>
    </div>
  );
}
