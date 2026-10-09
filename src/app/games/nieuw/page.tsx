import type { Metadata } from "next";
import { createGame } from "../actions";
import { GameForm } from "../GameForm";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Game toevoegen" };

export default async function NewGamePage(props: PageProps<"/games/nieuw">) {
  const sp = await props.searchParams;
  const nightId = typeof sp.avond === "string" && /^[0-9a-f-]{36}$/i.test(sp.avond) ? sp.avond : undefined;
  return (
    <div>
      <PageHeader back={nightId ? `/agenda/${nightId}/host` : "/games"} kicker="NIEUWE GAME" title="Game toevoegen" />
      <Flash sp={sp} />
      {nightId && (
        <p className="card mb-3 bg-yellow-soft px-4 py-3 text-sm font-bold">
          🎮 Na het opslaan ga je terug naar de avond, met deze game klaargezet voor het volgende potje.
        </p>
      )}
      <GameForm action={createGame} submitLabel={nightId ? "▶ Game maken & terug naar de avond" : "▶ Game toevoegen"} nightId={nightId} />
    </div>
  );
}
