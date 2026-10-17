"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAvatar } from "@/lib/avatar";

/** Sla je zelfgemaakte avatar op (of verwijder hem met null). */
export async function saveAvatar(raw: string | null): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const config = raw === null ? null : parseAvatar(raw);
  if (raw !== null && !config) return { ok: false };
  const { error } = await supabase.from("profiles").update({ avatar_config: config }).eq("id", user.id);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}
