import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/db/types";
import { evaluateRefundEligibility } from "@/lib/domain/refunds/policy";
import { createServiceInAppNotification } from "@/lib/notifications/repository";
import { logBusinessEvent } from "@/lib/observability/logger";
import type { PaymentProvider } from "@/lib/payments/provider";
import type { PaymentSnapshot } from "@/lib/payments/types";

/**
 * First-phase mock refund execution.
 *
 * Drives an order in `refund_review` through the refund state machine:
 *   refund_review --refund_started--> refunding
 *   refunding     --refund_succeeded--> refunded
 *   refunding     --refund_failed----> refund_review   (retry allowed)
 *
 * This calls the channel-agnostic PaymentProvider (mock in phase one); the real
 * WeChat refund/settlement is still blocked until merchant onboarding. Runs with
 * a service-role client (admin pages call requireAdmin first) and writes audit
 * logs + status history for every transition.
 */

type Service = SupabaseClient<Database>;
type SeedableProvider = PaymentProvider & {
  seedPayment?: (snapshot: PaymentSnapshot) => void;
};

export type ExecuteRefundResult = {
  orderStatus: Database["public"]["Enums"]["order_status"];
  status: "succeeded" | "failed";
};

async function writeAudit(
  service: Service,
  input: {
    action: string;
    actorId: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await service.from("audit_logs").insert({
    action: input.action,
    actor_id: input.actorId,
    entity_id: input.entityId,
    entity_type: "refund",
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function transitionOrder(
  service: Service,
  orderId: string,
  fromStatus: Database["public"]["Enums"]["order_status"],
  toStatus: Database["public"]["Enums"]["order_status"],
  actorId: string,
  reason: string,
) {
  const { data: updated, error: updateError } = await service
    .from("orders")
    .update({ status: toStatus })
    .eq("id", orderId)
    .eq("status", fromStatus)
    .select("id");

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Guard against a concurrent transition: if no row moved from fromStatus,
  // the order is no longer in the expected state — do not record history.
  if (!updated || updated.length === 0) {
    throw new Error("订单状态已变化，操作未生效，请刷新后重试");
  }

  const { error: historyError } = await service
    .from("order_status_history")
    .insert({
      actor_id: actorId,
      from_status: fromStatus,
      order_id: orderId,
      reason,
      to_status: toStatus,
    });

  if (historyError) {
    throw new Error(historyError.message);
  }
}

export async function executeOrderRefund(
  service: Service,
  provider: SeedableProvider,
  input: { adminId: string; orderId: string; reason: string },
): Promise<ExecuteRefundResult> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("退款必须填写原因");
  }

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, amount_cents, status, customer_id, developer_id")
    .eq("id", input.orderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (order.status !== "refund_review") {
    throw new Error("只有处于退款审核的订单可以执行退款");
  }

  const { data: payment, error: paymentError } = await service
    .from("payments")
    .select("id, amount_cents, status, provider_transaction_id")
    .eq("order_id", input.orderId)
    .eq("status", "succeeded")
    .maybeSingle();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (!payment || !payment.provider_transaction_id) {
    throw new Error("缺少成功支付记录，无法退款");
  }

  const { data: share } = await service
    .from("profit_shares")
    .select("status")
    .eq("order_id", input.orderId)
    .maybeSingle();

  const eligibility = evaluateRefundEligibility({
    orderStatus: order.status,
    paidAmountCents: payment.amount_cents,
    paymentStatus: "succeeded",
    requestedAmountCents: payment.amount_cents,
    shareStatus: share?.status,
  });

  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

  // Move into refunding before contacting the channel.
  await transitionOrder(
    service,
    input.orderId,
    "refund_review",
    "refunding",
    input.adminId,
    reason,
  );

  const platformRefundNo = `mock-refund-${input.orderId}`;
  const { data: refundRow, error: refundError } = await service
    .from("refunds")
    .upsert(
      {
        amount_cents: payment.amount_cents,
        order_id: input.orderId,
        payment_id: payment.id,
        platform_refund_no: platformRefundNo,
        reason,
        status: "processing",
      },
      { onConflict: "platform_refund_no" },
    )
    .select()
    .single();

  if (refundError) {
    throw new Error(refundError.message);
  }

  provider.seedPayment?.({
    amountCents: payment.amount_cents,
    providerPaymentId: payment.provider_transaction_id,
    status: "succeeded",
  });

  let succeeded = false;
  let providerRefundId: string | null = null;

  try {
    const result = await provider.refund({
      amountCents: payment.amount_cents,
      idempotencyKey: platformRefundNo,
      paymentProviderId: payment.provider_transaction_id,
      reason,
    });
    providerRefundId = result.providerRefundId;
    succeeded = result.status === "succeeded";
  } catch {
    succeeded = false;
  }

  if (succeeded) {
    const { error: refundUpdateError } = await service
      .from("refunds")
      .update({ provider_refund_id: providerRefundId, status: "succeeded" })
      .eq("id", refundRow.id);

    if (refundUpdateError) {
      throw new Error(refundUpdateError.message);
    }

    await transitionOrder(
      service,
      input.orderId,
      "refunding",
      "refunded",
      input.adminId,
      reason,
    );

    await writeAudit(service, {
      action: "refund.succeeded",
      actorId: input.adminId,
      entityId: input.orderId,
      metadata: { amountCents: payment.amount_cents, providerRefundId, reason },
    });

    for (const recipientId of [order.customer_id, order.developer_id]) {
      await createServiceInAppNotification({
        actorId: input.adminId,
        body: reason,
        eventKey: `refund:${input.orderId}:succeeded`,
        metadata: { orderId: input.orderId },
        recipientId,
        title: "订单退款已完成",
        type: "refund_updated",
      });
    }

    logBusinessEvent("refund.succeeded", {
      amountCents: payment.amount_cents,
      orderId: input.orderId,
    });

    return { orderStatus: "refunded", status: "succeeded" };
  }

  // Failure: record it and return the order to refund_review for retry.
  const { error: failUpdateError } = await service
    .from("refunds")
    .update({ provider_refund_id: providerRefundId, status: "failed" })
    .eq("id", refundRow.id);

  if (failUpdateError) {
    throw new Error(failUpdateError.message);
  }

  await transitionOrder(
    service,
    input.orderId,
    "refunding",
    "refund_review",
    input.adminId,
    `退款失败：${reason}`,
  );

  await writeAudit(service, {
    action: "refund.failed",
    actorId: input.adminId,
    entityId: input.orderId,
    metadata: { providerRefundId, reason },
  });

  logBusinessEvent("refund.failed", { orderId: input.orderId });

  return { orderStatus: "refund_review", status: "failed" };
}
