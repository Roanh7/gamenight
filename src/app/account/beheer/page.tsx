import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ResetCodes } from "./ResetCodes";

export const metadata: Metadata = { title: "Beheer" };

/** 🔑 Beheer (alleen beheerders): spelers helpen die hun wachtwoord of e-mail kwijt zijn. */
export default async function AdminPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_app_admin");
  if (!isAdmin) redirect("/account");
  const { data } = await supabase.rpc("admin_players");
  const players = ((data ?? []) as { id: string; username: string; email: string; last_sign_in_at: string | null }[]);
  return (
    <div>
      <PageHeader back="/account#instellingen" kicker="🔑 BEHEER" title="Wachtwoord herstellen" />
      <div className="card mb-4 p-4 text-sm font-bold">
        <p className="mb-2">Iemand zijn wachtwoord vergeten?</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Tik bij die speler op <b className="font-black">🔑 CODE</b>.</li>
          <li>Kopieer het bericht en stuur het via WhatsApp naar de speler.</li>
          <li>De speler tikt bij het inloggen op <b className="font-black">Wachtwoord vergeten?</b> en vult de code en een nieuw wachtwoord in.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Wachtwoorden zelf kan niemand zien, ook jij niet. De code is 24 uur geldig, werkt één keer en vervalt na 5 foute pogingen. Inloggen gaat met het
          e-mailadres hieronder.
        </p>
      </div>
      <ResetCodes players={players} />
    </div>
  );
}
