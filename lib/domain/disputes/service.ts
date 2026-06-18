import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceInAppNotification } from "@/lib/notifications/repository";
import { logBusinessEvent } from "@/lib/observability/logger";

export type OpenOrderDisputeInput = {
  reason: string;
  requestedResolution: "accept" | "continue" | "refund";
};

export type ResolveDisputeRefundInput = {
  adminId: string;
  notes: string;
};

async function assertCanAccessOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("无权访问该订单");
  }
}

export async function openOrderDispute(
  supabase: SupabaseClient,
  orderId: string,
  input: OpenOrderDisputeInput,
) {
  await assertCanAccessOrder(supabase, orderId);

  const { data, error } = await supabase.rpc("open_order_dispute", {
    dispute_reason: input.reason,
    requested_dispute_resolution: input.requestedResolution,
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function resolveDispute(
  supabase: SupabaseClient,
  disputeId: string,
  input: {
    adminId: string;
    auditAction: string;
    disputeStatus: "resolved_continue" | "resolved_accept";
    notes: string;
    toOrderStatus: "in_progress" | "accepted";
    title: string;
  },
) {
  const notes = input.notes.trim();

  if (!notes) {
    throw new Error("裁决说明不能为空");
  }

  const { data: existingDispute, error: lookupError } = await supabase
    .from("disputes")
    .select("id, order_id")
    .eq("id", disputeId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (!existingDispute) {
    throw new Error("争议不存在");
  }

  // Transition the order first (guarded by from-status). If the order is no
  // longer `disputed`, abort before touching the dispute so the two stay
  // consistent.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ status: input.toOrderStatus })
    .eq("id", existingDispute.order_id)
    .eq("status", "disputed")
    .select()
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    throw new Error("订单状态已变化，争议无法裁决，请刷新后重试");
  }

  const { data: dispute, error: disputeError } = await supabase
    .from("disputes")
    .update({
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
      resolved_by: input.adminId,
      status: input.disputeStatus,
    })
    .eq("id", disputeId)
    .select()
    .single();

  if (disputeError) {
    throw new Error(disputeError.message);
  }

  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      actor_id: input.adminId,
      from_status: "disputed",
      order_id: order.id,
      reason: notes,
      to_status: input.toOrderStatus,
    });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    action: input.auditAction,
    actor_id: input.adminId,
    entity_id: dispute.id,
    entity_type: "dispute",
    metadata: { notes, orderId: order.id },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }

  for (const recipientId of [order.customer_id, order.developer_id]) {
    await createServiceInAppNotification({
      actorId: input.adminId,
      body: notes,
      eventKey: `dispute:${dispute.id}:${input.disputeStatus}`,
      metadata: { disputeId: dispute.id, orderId: order.id },
      recipientId,
      title: input.title,
      type: "refund_updated",
    });
  }

  logBusinessEvent("dispute.resolved", {
    disputeId: dispute.id,
    orderId: order.id,
    resolution: input.disputeStatus,
  });

  return { dispute, order };
}

export async function resolveDisputeAsContinue(
  supabase: SupabaseClient,
  disputeId: string,
  input: ResolveDisputeRefundInput,
) {
  return resolveDispute(supabase, disputeId, {
    adminId: input.adminId,
    auditAction: "dispute.resolve_continue",
    disputeStatus: "resolved_continue",
    notes: input.notes,
    title: "争议裁决：继续履约",
    toOrderStatus: "in_progress",
  });
}

export async function resolveDisputeAsAccept(
  supabase: SupabaseClient,
  disputeId: string,
  input: ResolveDisputeRefundInput,
) {
  return resolveDispute(supabase, disputeId, {
    adminId: input.adminId,
    auditAction: "dispute.resolve_accept",
    disputeStatus: "resolved_accept",
    notes: input.notes,
    title: "争议裁决：验收结算",
    toOrderStatus: "accepted",
  });
}

export async function resolveDisputeAsFullRefund(
  supabase: SupabaseClient,
  disputeId: string,
  input: ResolveDisputeRefundInput,
) {
  const notes = input.notes.trim();

  if (!notes) {
    throw new Error("裁决说明不能为空");
  }

  const { data: existingDispute, error: lookupError } = await supabase
    .from("disputes")
    .select("id, order_id")
    .eq("id", disputeId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (!existingDispute) {
    throw new Error("争议不存在");
  }

  // Transition the order first (guarded by from-status), then the dispute.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ status: "refund_review" })
    .eq("id", existingDispute.order_id)
    .eq("status", "disputed")
    .select()
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    throw new Error("订单状态已变化，争议无法裁决，请刷新后重试");
  }

  const { data: dispute, error: disputeError } = await supabase
    .from("disputes")
    .update({
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
      resolved_by: input.adminId,
      status: "resolved_refund",
    })
    .eq("id", disputeId)
    .select()
    .single();

  if (disputeError) {
    throw new Error(disputeError.message);
  }

  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      actor_id: input.adminId,
      from_status: "disputed",
      order_id: order.id,
      reason: notes,
      to_status: "refund_review",
    });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    action: "dispute.resolve_refund",
    actor_id: input.adminId,
    entity_id: dispute.id,
    entity_type: "dispute",
    metadata: { notes, orderId: order.id },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }

  for (const recipientId of [order.customer_id, order.developer_id]) {
    await createServiceInAppNotification({
      actorId: input.adminId,
      body: notes,
      eventKey: `dispute:${dispute.id}:resolved_refund`,
      metadata: { disputeId: dispute.id, orderId: order.id },
      recipientId,
      title: "争议已裁决全额退款",
      type: "refund_updated",
    });
  }

  logBusinessEvent("dispute.resolved", {
    disputeId: dispute.id,
    orderId: order.id,
    resolution: "resolved_refund",
  });

  return { dispute, order };
}
