"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <ErrorNote message={state?.error} />
      <SubmitButton pendingText="Inloggen…">▶ Inloggen</SubmitButton>
    </form>
  );
}
