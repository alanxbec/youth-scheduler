// Service-role Supabase client. SERVER ONLY — bypasses Row-Level Security.
//
// Used exclusively by the public youth page (/s/[token]) server code, and
// always scoped to the single case manager resolved from the link's
// share_token. Never import this from a client component.

import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
