"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Ververst de pagina zodra er ergens een potje wordt afgerond, heropend of weggegooid
 * (Supabase Realtime op de tabel matches). Alleen als de app zichtbaar is; meerdere
 * meldingen vlak na elkaar worden samengevoegd tot één verversing.
 */
export function ResultsRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    const refresh = () => {
      if (document.visibilityState !== "visible") {
        pending = true;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1200);
    };
    const onVisible = () => {
      if (pending && document.visibilityState === "visible") {
        pending = false;
        refresh();
      }
    };
    const channel = supabase
      .channel("results-refresh")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches" }, refresh)
      .subscribe();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
