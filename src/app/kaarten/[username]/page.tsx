import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient, getMe } from "@/lib/supabase/server";
import { loadCards } from "@/lib/cards";
import { EDITIONS, EDITION_ORDER } from "@/lib/player";
import { seasonLabel } from "@/lib/stats";
import { PlayerCard } from "@/components/PlayerCard";
import { ShareImage } from "@/components/ShareImage";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Player Card" };

export default async function PlayerCardsPage(props: PageProps<"/kaarten/[username]">) {
  const { username } = await props.params;
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const data = await loadCards(supabase);
  const p = data.profiles.list.find((x) => x.username.toLowerCase() === decodeURIComponent(username).toLowerCase());
  if (!p) notFound();
  if (p.id === me.user.id) redirect("/kaarten");
  const { col, nickname, shown } = data.collectionFor(p.id);
  const key = shown.kind === "season" ? `season:${shown.season}` : shown.edition;
  const earned = EDITION_ORDER.filter((e) => col.earned[e]);

  return (
    <div>
      <PageHeader back="/kaarten?tab=album" kicker="PLAYER CARD" title={p.username} />
      <section className="card flex flex-col items-center gap-3 p-4">
        <PlayerCard
          name={p.username}
          color={p.avatar_color}
          emoji={p.avatar_emoji} config={p.avatar_config}
          nickname={nickname}
          edition={shown.edition}
          stats={shown.stats}
          mainIcon={data.iconOf(shown.stats)}
          season={shown.season}
          size="lg"
        />
        <div className="grid w-full max-w-[300px] grid-cols-2 gap-2">
          <Link
            href={`/kaarten/vergelijk?a=${encodeURIComponent(me.profile.username)}&b=${encodeURIComponent(p.username)}`}
            className="btn btn-yellow btn-sm"
          >
            ⚔️ Vergelijk
          </Link>
          <Link href={`/spelers/${p.username}`} className="btn btn-secondary btn-sm">
            Profiel
          </Link>
        </div>
        <div className="w-full max-w-[300px]">
          <ShareImage
            src={`/kaarten/${encodeURIComponent(p.username)}/kaart.png?kaart=${encodeURIComponent(key)}`}
            filename="gamenight-kaart.png"
            title={`Player Card van ${p.username}`}
            label="Deel deze kaart"
          />
        </div>
      </section>

      <SectionTitle>
        Verzameling ({earned.length}/{EDITION_ORDER.length} edities)
      </SectionTitle>
      <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-3">
        {EDITION_ORDER.map((e) => (
          <li key={e} className="flex flex-col items-center gap-1">
            <PlayerCard
              name={p.username}
              color={p.avatar_color}
              emoji={p.avatar_emoji} config={p.avatar_config}
              nickname={nickname}
              edition={e}
              stats={col.current}
              mainIcon={data.iconOf(col.current)}
              size="sm"
              locked={!col.earned[e]}
            />
            {!col.earned[e] && <p className="max-w-[132px] text-center text-[11px] font-bold text-muted">{EDITIONS[e].how}</p>}
          </li>
        ))}
      </ul>

      {col.seasons.length > 0 && (
        <>
          <SectionTitle>Seizoenskaarten</SectionTitle>
          <ul className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-3">
            {col.seasons.map((s) => (
              <li key={s.season}>
                <PlayerCard
                  name={p.username}
                  color={p.avatar_color}
                  emoji={p.avatar_emoji} config={p.avatar_config}
                  nickname={s.rank ? `#${s.rank} IN ${seasonLabel(s.season).toUpperCase()}` : nickname}
                  edition={s.edition}
                  stats={s}
                  mainIcon={data.iconOf(s)}
                  season={s.season}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
