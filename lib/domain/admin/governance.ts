import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/db/types";
import { logBusinessEvent } from "@/lib/observability/logger";

/**
 * Admin high-risk governance actions.
 *
 * All functions here run with a service-role client (admin pages call
 * requireAdmin first) and write an audit log for every action. Per
 * OPERATIONS.md, freezing/suspending/banning only blocks new activity — it
 * never edits historical financial records.
 */

type Service = SupabaseClient<Database>;

async function writeAudit(
  service: Service,
  input: {
    action: string;
    actorId: string;
    entityId: string;
    entityType: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await service.from("audit_logs").insert({
    action: input.action,
    actor_id: input.actorId,
    entity_id: input.entityId,
    entity_type: input.entityType,
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setUserSuspension(
  service: Service,
  input: { adminId: string; note: string; suspended: boolean; userId: string },
) {
  const note = input.note.trim();
  if (!note) {
    throw new Error("封禁或解封必须填写原因");
  }

  const { error } = await service
    .from("profiles")
    .update({ is_suspended: input.suspended })
    .eq("id", input.userId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: input.suspended ? "user.suspend" : "user.unsuspend",
    actorId: input.adminId,
    entityId: input.userId,
    entityType: "profile",
    metadata: { note },
  });

  logBusinessEvent(input.suspended ? "user.suspended" : "user.unsuspended", {
    userId: input.userId,
  });
}

export async function setOrderFrozen(
  service: Service,
  input: { adminId: string; frozen: boolean; note: string; orderId: string },
) {
  const note = input.note.trim();
  if (!note) {
    throw new Error("冻结或解冻必须填写原因");
  }

  const { error } = await service
    .from("orders")
    .update({ is_frozen: input.frozen })
    .eq("id", input.orderId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: input.frozen ? "order.freeze" : "order.unfreeze",
    actorId: input.adminId,
    entityId: input.orderId,
    entityType: "order",
    metadata: { note },
  });

  logBusinessEvent(input.frozen ? "order.frozen" : "order.unfrozen", {
    orderId: input.orderId,
  });
}

export async function recordPaymentReview(
  service: Service,
  input: { adminId: string; note: string; paymentId: string },
) {
  const note = input.note.trim();
  if (!note) {
    throw new Error("人工核对必须填写结论");
  }

  // No financial record is modified — this only records that an operator
  // manually reviewed an abnormal payment, for traceability.
  await writeAudit(service, {
    action: "payment.manual_review",
    actorId: input.adminId,
    entityId: input.paymentId,
    entityType: "payment",
    metadata: { note },
  });
}

export async function setDemandSuspension(
  service: Service,
  input: {
    adminId: string;
    demandId: string;
    note: string;
    suspended: boolean;
  },
) {
  const note = input.note.trim();
  if (!note) {
    throw new Error("暂停或恢复必须填写原因");
  }

  const { error } = await service
    .from("demands")
    .update({ is_suspended: input.suspended })
    .eq("id", input.demandId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: input.suspended ? "demand.suspend" : "demand.resume",
    actorId: input.adminId,
    entityId: input.demandId,
    entityType: "demand",
    metadata: { note },
  });

  logBusinessEvent(input.suspended ? "demand.suspended" : "demand.resumed", {
    demandId: input.demandId,
  });
}

// ---------------------------------------------------------------------------
// Catalog moderation (demand / product review + product takedown)
// ---------------------------------------------------------------------------

export type AdminReviewDecision = "approve" | "reject";

export type AdminModerationResult =
  | { entityId: string; ok: true }
  | { ok: false; reason: "missing_note" };

function isReviewDecision(value: string): value is AdminReviewDecision {
  return value === "approve" || value === "reject";
}

/**
 * Review (approve/reject) a demand. Owns the publish/close state transition and
 * the audit log that previously lived inline in the admin page. Returns a typed
 * result so the page maps it to a redirect; throws only on a real DB error.
 */
export async function reviewDemand(
  service: Service,
  input: {
    adminId: string;
    decision: string;
    demandId: string;
    note: string;
  },
): Promise<AdminModerationResult> {
  const note = input.note.trim();

  if (!input.demandId || !isReviewDecision(input.decision) || !note) {
    return { ok: false, reason: "missing_note" };
  }

  const approve = input.decision === "approve";
  const { error } = await service
    .from("demands")
    .update({
      published_at: approve ? new Date().toISOString() : null,
      review_notes: note,
      status: approve ? "published" : "closed",
    })
    .eq("id", input.demandId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: approve ? "demand.approve" : "demand.reject",
    actorId: input.adminId,
    entityId: input.demandId,
    entityType: "demand",
    metadata: { note },
  });

  logBusinessEvent(approve ? "demand.approved" : "demand.rejected", {
    demandId: input.demandId,
  });

  return { entityId: input.demandId, ok: true };
}

/**
 * Review (approve/reject) an AI app marketplace product. Owns the publish/reject
 * state transition and audit log.
 */
export async function reviewProduct(
  service: Service,
  input: {
    adminId: string;
    decision: string;
    note: string;
    productId: string;
  },
): Promise<AdminModerationResult> {
  const note = input.note.trim();

  if (!input.productId || !isReviewDecision(input.decision) || !note) {
    return { ok: false, reason: "missing_note" };
  }

  const approve = input.decision === "approve";
  const { error } = await service
    .from("products")
    .update({
      published_at: approve ? new Date().toISOString() : null,
      review_notes: note,
      status: approve ? "published" : "rejected",
    })
    .eq("id", input.productId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: approve ? "product.approve" : "product.reject",
    actorId: input.adminId,
    entityId: input.productId,
    entityType: "product",
    metadata: { note },
  });

  logBusinessEvent(approve ? "product.approved" : "product.rejected", {
    productId: input.productId,
  });

  return { entityId: input.productId, ok: true };
}

/**
 * Suspend (take down) or resume a product on the marketplace. Suspension only
 * hides the product and blocks new purchases; it does not alter past purchases.
 */
export async function setProductSuspension(
  service: Service,
  input: {
    adminId: string;
    note: string;
    productId: string;
    suspended: boolean;
  },
): Promise<AdminModerationResult> {
  const note = input.note.trim();

  if (!input.productId || !note) {
    return { ok: false, reason: "missing_note" };
  }

  const { error } = await service
    .from("products")
    .update({ is_suspended: input.suspended })
    .eq("id", input.productId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(service, {
    action: input.suspended ? "product.suspend" : "product.resume",
    actorId: input.adminId,
    entityId: input.productId,
    entityType: "product",
    metadata: { note },
  });

  logBusinessEvent(input.suspended ? "product.suspended" : "product.resumed", {
    productId: input.productId,
  });

  return { entityId: input.productId, ok: true };
}
