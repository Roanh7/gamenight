import type { ReactNode } from "react";

/** Knoppen die altijd onderaan in beeld blijven (boven de menubalk), handig met één hand. */
export function ActionBar({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <>
      <div className={top ? "h-32" : "h-24"} aria-hidden />
      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "calc(var(--nav-h, 100px) + 10px)" }}>
        {top && <div className="mx-auto mb-2 flex max-w-xl justify-center">{top}</div>}
        <div className="mx-auto flex max-w-xl gap-2">{children}</div>
      </div>
    </>
  );
}
