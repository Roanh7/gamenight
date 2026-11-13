"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetWithCode } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote } from "@/components/ui";

export function ResetForm() {
  const [state, action] = useActionState(resetWithCode, undefined);
  if (state?.info) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-xl border-2 border-line bg-green-soft px-3 py-2 text-sm font-bold">
          ✅ {state.info}
        </p>
        <Link href="/login" className="btn btn-primary w-full">
          ▶ Naar inloggen
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="login">
          E-mail of gebruikersnaam
        </label>
        <input id="login" name="login" type="text" autoComplete="username" autoCapitalize="none" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="code">
          Herstelcode
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Bijv. K7MQ-3XPA"
          required
          className="input pixel tracking-widest"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Nieuw wachtwoord
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password2">
          Nog een keer
        </label>
        <input id="password2" name="password2" type="password" autoComplete="new-password" minLength={6} required className="input" />
      </div>
      <ErrorNote message={state?.error} />
      <SubmitButton pendingText="Even geduld…">🔑 Wachtwoord opslaan</SubmitButton>
    </form>
  );
}
