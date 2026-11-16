import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default async function ForgotPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("app_admin_names");
  const admins = ((data as string[] | null) ?? []).join(" of ") || "de beheerder";
  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/">
          <Logo size="lg" />
        </Link>
      </div>
      <div className="card p-5">
        <p className="pixel mb-2 text-[10px] text-red">CONTINUE?</p>
        <h1 className="mb-1 text-xl font-black">Wachtwoord vergeten</h1>
        <ol className="mb-5 mt-3 space-y-2 text-sm font-bold">
          <li className="flex gap-2">
            <span className="pixel mt-0.5 text-[10px] text-red">1</span>
            <span>
              Vraag <b className="font-black">{admins}</b> om een <b className="font-black">herstelcode</b>. Die is 24 uur geldig.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="pixel mt-0.5 text-[10px] text-red">2</span>
            <span>Vul hieronder je e-mail of gebruikersnaam, de code en een nieuw wachtwoord in.</span>
          </li>
          <li className="flex gap-2">
            <span className="pixel mt-0.5 text-[10px] text-red">3</span>
            <span>Je wordt meteen ingelogd. Je punten, XP en al de rest blijven gewoon staan.</span>
          </li>
        </ol>
        <ResetForm />
      </div>
      <p className="mt-5 text-center text-sm">
        Weet je het weer?{" "}
        <Link href="/login" className="font-extrabold text-red underline underline-offset-2">
          Log in
        </Link>
      </p>
      <p className="mt-2 text-center text-xs font-bold text-muted">Je e-mailadres kwijt? Ook dat kan {admins} voor je opzoeken.</p>
    </div>
  );
}
