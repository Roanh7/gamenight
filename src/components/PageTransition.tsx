"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Korte overgang als je naar een andere pagina gaat (bijv. een ander tabblad):
 * de pagina komt een paar pixels omhoog in beeld. Bewust zonder "transform", zodat
 * vaste onderdelen (knoppenbalk onderaan, pop-ups) op hun plek blijven.
 * Filters en tabs binnen dezelfde pagina (?seizoen=…) spelen de overgang niet opnieuw af.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="page-enter">
      {children}
    </div>
  );
}
