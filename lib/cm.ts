// Fetch the logged-in CM's profile row, creating it on first login.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { CaseManager } from "./types";

export async function getOrCreateCm(
  supabase: SupabaseClient,
  user: User
): Promise<CaseManager> {
  const { data: existing } = await supabase
    .from("case_managers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing) return existing as CaseManager;

  const name = (user.email ?? "").split("@")[0] || "Case Manager";
  const { data: created, error } = await supabase
    .from("case_managers")
    .insert({ auth_user_id: user.id, name, email: user.email ?? "" })
    .select("*")
    .single();

  if (error) {
    // Unique-constraint race (two tabs on first login): the row exists now.
    const { data: retry, error: retryError } = await supabase
      .from("case_managers")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();
    if (retryError) throw new Error(`Could not load your profile: ${error.message}`);
    return retry as CaseManager;
  }

  return created as CaseManager;
}
