import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";
import { deleteGame, updateGame } from "../../actions";
import { GameForm } from "../../GameForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Game bewerken" };

export default async function EditGamePage(props: PageProps<"/games/[id]/bewerken">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const game = data as Game;
  return (
    <div>
      <PageHeader back={`/games/${id}`} kicker="BEWERKEN" title={game.name} />
      <Flash sp={sp} />
      <p className="mb-4 rounded-xl border-2 border-dashed border-line/40 px-3 py-2 text-xs font-bold text-muted">
        Nieuwe scoreregels gelden voor nieuwe potjes. Al gespeelde potjes houden hun punten.
      </p>
      <GameForm action={updateGame} game={game} submitLabel="Opslaan" />
      <form action={deleteGame} className="mt-8">
        <input type="hidden" name="game_id" value={id} />
        <SubmitButton className="btn btn-secondary btn-sm w-full text-red" confirm={`${game.name} verwijderen?`}>
          Game verwijderen
        </SubmitButton>
      </form>
    </div>
  );
}
