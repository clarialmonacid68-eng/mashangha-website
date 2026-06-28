import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

/**
 * Read-only notification queries for workspace pages. They use the caller's
 * RLS-scoped client, so recipient visibility remains enforced by database
 * policies.
 */

type Service = SupabaseClient<Database>;

export async function listWorkspaceNotifications(service: Service) {
  const { data, error } = await service
    .from("notifications")
    .select("id, title, body, event_type, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
