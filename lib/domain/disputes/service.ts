import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function resolveDisputeAsFullRefund(
  supabase: SupabaseClient,
  disputeId: string,
  input: ResolveDisputeRefundInput,
) {
  const notes = input.notes.trim();

  if (!notes) {
    throw new Error("裁决说明不能为空");
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ status: "refund_review" })
    .eq("id", dispute.order_id)
    .select()
    .single();

  if (orderError) {
    throw new Error(orderError.message);
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

  return { dispute, order };
}
