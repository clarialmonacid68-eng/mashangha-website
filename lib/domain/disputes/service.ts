import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenOrderDisputeInput = {
  reason: string;
  requestedResolution: "accept" | "continue" | "refund";
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
