import type { ReactNode } from "react";

/**
 * Knoppen die altijd onderaan in beeld blijven (boven de menubalk), handig met één hand.
 * De pagina krijgt onderaan extra ruimte (zie .has-actionbar in globals.css), zodat alles
 * wat onder het scorebord staat, zoals "Potje verwijderen", nooit achter deze knoppen verdwijnt.
 */
export function ActionBar({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <div
      className={`action-bar fixed inset-x-0 z-30 px-4 ${top ? "action-bar-top" : ""}`}
      style={{ bottom: "calc(var(--nav-h, 100px) + 10px)" }}
    >
      {top && <div className="mx-auto mb-2 flex max-w-xl justify-center">{top}</div>}
      <div className="mx-auto flex max-w-xl gap-2">{children}</div>
    </div>
  );
}
