"use client";

import { useState } from "react";
import { BG, COLOR_NAME } from "@/lib/colors";
import { COLORS, type Color } from "@/lib/types";

export function ColorPicker({ name, defaultValue = "red" }: { name: string; defaultValue?: Color }) {
  const [value, setValue] = useState<Color>(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={COLOR_NAME[c]}
            onClick={() => setValue(c)}
            className={`${BG[c]} h-9 w-9 rounded-lg border-2 border-line transition-transform ${
              value === c ? "scale-110 shadow-[0_3px_0_var(--color-line)] ring-2 ring-yellow ring-offset-2 ring-offset-paper" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
