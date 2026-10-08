"use client";

import { useEffect, useState } from "react";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Datum+tijd in de tijdzone van de gebruiker, verstuurd als ISO-string. */
export function DateTimeField({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [local, setLocal] = useState("");

  // Datum hangt af van de tijdzone van de browser, daarom pas na het laden invullen.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (defaultValue) {
      setLocal(toLocalInput(new Date(defaultValue)));
    } else {
      // Standaard: komende vrijdag 20:00
      const d = new Date();
      const add = (5 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + add);
      d.setHours(20, 0, 0, 0);
      setLocal(toLocalInput(d));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [defaultValue]);

  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <input
        id={name}
        type="datetime-local"
        required
        className="input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
