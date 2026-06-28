import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

/**
 * Read-only account settings queries. They use the caller's RLS-scoped client
 * and keep workspace settings pages free of inline data access.
 */

type Service = SupabaseClient<Database>;

export async function listCurrentUserRoles(
  service: Service,
  userId: string,
): Promise<string[]> {
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data?.map(({ role }) => role) ?? [];
}

export async function getDeveloperReviewStatus(
  service: Service,
  userId: string,
) {
  const { data, error } = await service
    .from("developer_profiles")
    .select("review_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
