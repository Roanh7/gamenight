import type { ReactNode } from "react";

/** Knoppen die altijd onderaan in beeld blijven (boven de menubalk), handig met één hand. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(var(--nav-h, 100px) + 10px)" }}>
        <div className="mx-auto flex max-w-xl gap-2">{children}</div>
      </div>
    </>
  );
}
