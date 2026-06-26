import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

/**
 * Read-only list queries for the admin console. They run with a service-role
 * client (admin pages call requireAdmin first) and return bounded recent rows
 * for each moderated entity. Centralising them keeps admin pages as thin
 * display layers with no inline data access.
 */

type Service = SupabaseClient<Database>;

const ADMIN_LIST_LIMIT = 50;

export async function listAdminDemands(service: Service) {
  const { data, error } = await service
    .from("demands")
    .select(
      "id, title, description, status, review_notes, is_suspended, customer_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAdminProducts(service: Service) {
  const { data, error } = await service
    .from("products")
    .select(
      "id, title, summary, category, price_cents, status, review_notes, is_suspended, seller_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAdminOrders(service: Service) {
  const { data, error } = await service
    .from("orders")
    .select(
      "id, status, amount_cents, customer_id, developer_id, paid_at, is_frozen, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAdminDisputes(service: Service) {
  const { data, error } = await service
    .from("disputes")
    .select(
      "id, order_id, status, reason, requested_resolution, resolution_notes, opened_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAdminAuditLogs(service: Service) {
  const { data, error } = await service
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

const RISK_LIST_LIMIT = 20;

export async function listSuspendedProfiles(service: Service) {
  const { data, error } = await service
    .from("profiles")
    .select("id, display_name, is_suspended, updated_at")
    .eq("is_suspended", true)
    .limit(RISK_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAbnormalPayments(service: Service) {
  const { data, error } = await service
    .from("payments")
    .select("id, order_id, status, amount_cents, provider, updated_at")
    .in("status", ["failed", "closed"])
    .limit(RISK_LIST_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
