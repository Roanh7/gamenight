"use client";

import { useActionState } from "react";
import { signup } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote } from "@/components/ui";
import { ColorPicker } from "@/components/ColorPicker";

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);

  if (state?.info) {
    return (
      <div className="animate-pop rounded-xl border-2 border-line bg-green-soft p-4 text-sm font-bold">
        ✉️ {state.info}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">
          Spelersnaam
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={2}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          autoComplete="nickname"
          placeholder="bijv. Roan"
          className="input"
        />
        <p className="mt-1 text-xs text-muted">Letters, cijfers en _ (zonder spaties).</p>
      </div>
      <div>
        <span className="label">Jouw kleur</span>
        <ColorPicker name="color" />
      </div>
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
          autoComplete="new-password"
          minLength={6}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="invite">
          Uitnodigingscode
        </label>
        <input
          id="invite"
          name="invite"
          required
          autoCapitalize="characters"
          className="input uppercase"
          placeholder="••••••"
        />
      </div>
      <ErrorNote message={state?.error} />
      <SubmitButton pendingText="Speler aanmaken…">▶ Start</SubmitButton>
    </form>
  );
}
