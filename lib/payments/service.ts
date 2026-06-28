import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { createServiceInAppNotification } from "@/lib/notifications/repository";
import { logBusinessEvent } from "@/lib/observability/logger";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import type { PaymentProvider } from "@/lib/payments/provider";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

type CreateOrderPaymentInput = {
  idempotencyKey: string;
  orderId: string;
};

type ProviderPaymentInput = {
  providerPaymentId: string;
};

function unwrapSingleRpcRow<T>(data: T[] | T | null): T {
  if (Array.isArray(data)) {
    if (!data[0]) {
      throw new Error("Payment RPC returned no rows");
    }

    return data[0];
  }

  if (!data) {
    throw new Error("Payment RPC returned no rows");
  }

  return data;
}

function normalizePaymentOrderResult<
  T extends { payment: PaymentRow; target_order: OrderRow },
>(data: T[] | T | null): { order: OrderRow; payment: PaymentRow } {
  const row = unwrapSingleRpcRow(data);

  return {
    order: row.target_order,
    payment: row.payment,
  };
}

export async function createOrderPayment(
  supabase: SupabaseClient,
  provider: PaymentProvider,
  input: CreateOrderPaymentInput,
) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, amount_cents, status, is_frozen")
    .eq("id", input.orderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (order.is_frozen) {
    throw new Error("订单已被运营冻结，暂不能付款");
  }

  if (order.status !== "pending_payment") {
    throw new Error("订单当前不可付款");
  }

  const providerPayment = await provider.createPayment({
    amountCents: order.amount_cents,
    idempotencyKey: input.idempotencyKey,
    orderId: order.id,
    subject: "码上好订单全额付款",
  });

  const { data: payment, error } = await supabase.rpc("create_mock_payment", {
    payment_idempotency_key: input.idempotencyKey,
    provider_payment_id: providerPayment.providerPaymentId,
    target_order_id: order.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    payment,
    providerPayment: {
      ...providerPayment,
      amountCents: payment.amount_cents,
      providerPaymentId:
        payment.provider_transaction_id ?? providerPayment.providerPaymentId,
      status: payment.status === "closed" ? "closed" : "pending",
    },
  };
}

export async function confirmMockPayment(
  supabase: SupabaseClient,
  provider: PaymentProvider & {
    confirmPayment?: (providerPaymentId: string) => Promise<unknown>;
  },
  input: ProviderPaymentInput,
) {
  if (provider.confirmPayment) {
    await provider.confirmPayment(input.providerPaymentId);
  }

  const snapshot = await provider.queryPayment(input.providerPaymentId);

  if (snapshot.status !== "succeeded") {
    throw new Error("支付渠道尚未成功");
  }

  const { data, error } = await supabase.rpc("confirm_mock_payment", {
    provider_payment_id: input.providerPaymentId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = normalizePaymentOrderResult(data);
  await createServiceInAppNotification({
    eventKey: `payment:${result.order.id}:succeeded`,
    metadata: {
      orderId: result.order.id,
      paymentId: result.payment.id,
    },
    recipientId: result.order.developer_id,
    title: "客户已完成模拟付款",
    type: "payment_succeeded",
  });

  logBusinessEvent("payment.succeeded", {
    orderId: result.order.id,
    paymentId: result.payment.id,
  });

  return result;
}

export async function closeOrderPayment(
  supabase: SupabaseClient,
  provider: PaymentProvider,
  input: ProviderPaymentInput,
) {
  const snapshot = await provider.closePayment(input.providerPaymentId);

  if (snapshot.status !== "closed") {
    throw new Error("支付渠道未关闭");
  }

  const { data, error } = await supabase.rpc("close_mock_payment", {
    provider_payment_id: input.providerPaymentId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizePaymentOrderResult(data);
}

export type ConfirmOrderMockPaymentResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "missing_payment" | "confirm_failed";
    };

export async function confirmMockPaymentForCurrentUser(
  userClient: SupabaseClient<Database>,
  service: SupabaseClient<Database>,
  input: { orderId?: string; providerPaymentId: string },
): Promise<ConfirmOrderMockPaymentResult> {
  if (!input.providerPaymentId) {
    return { ok: false, reason: "missing_payment" };
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: payment } = await service
    .from("payments")
    .select("amount_cents, order_id, provider_transaction_id, status")
    .eq("provider", "mock")
    .eq("provider_transaction_id", input.providerPaymentId)
    .single();

  if (!payment || (input.orderId && payment.order_id !== input.orderId)) {
    return { ok: false, reason: "missing_payment" };
  }

  const { data: order } = await service
    .from("orders")
    .select("customer_id")
    .eq("id", payment.order_id)
    .single();

  if (order?.customer_id !== user.id) {
    return { ok: false, reason: "forbidden" };
  }

  const provider = new MockPaymentProvider();
  provider.seedPayment({
    amountCents: payment.amount_cents,
    providerPaymentId: input.providerPaymentId,
    status: payment.status === "closed" ? "closed" : "pending",
  });

  try {
    await confirmMockPayment(service, provider, {
      providerPaymentId: input.providerPaymentId,
    });
  } catch {
    return { ok: false, reason: "confirm_failed" };
  }

  return { ok: true, orderId: payment.order_id };
}

/**
 * Confirm a mock payment for the current user from the pay page.
 *
 * Owns the business rules that previously lived inline in the page server
 * action: locate the mock payment, verify it belongs to the given order and to
 * the authenticated buyer, seed the mock provider from the stored snapshot, and
 * run the confirmation. Returns a typed result so the page maps it to redirects.
 *
 * `userClient` is the RLS-scoped client (identifies the caller); `service` is
 * the service-role client used to read payment/order rows and run the RPC.
 */
export async function confirmOrderMockPaymentForUser(
  userClient: SupabaseClient<Database>,
  service: SupabaseClient<Database>,
  input: { orderId: string; providerPaymentId: string },
): Promise<ConfirmOrderMockPaymentResult> {
  return confirmMockPaymentForCurrentUser(userClient, service, input);
}
