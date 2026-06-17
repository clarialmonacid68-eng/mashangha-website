import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { createServiceInAppNotification } from "@/lib/notifications/repository";
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
    .select("id, amount_cents, status")
    .eq("id", input.orderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
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

  return { payment, providerPayment };
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
