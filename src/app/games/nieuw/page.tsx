import type { Metadata } from "next";
import { createGame } from "../actions";
import { GameForm } from "../GameForm";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Game toevoegen" };

export default async function NewGamePage(props: PageProps<"/games/nieuw">) {
  const sp = await props.searchParams;
  return (
    <div>
      <PageHeader back="/ranking" kicker="NIEUWE GAME" title="Game toevoegen" />
      <Flash sp={sp} />
      <GameForm action={createGame} submitLabel="▶ Game toevoegen" />
    </div>
  );
}
