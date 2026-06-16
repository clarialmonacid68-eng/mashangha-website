import { NextResponse } from "next/server";

import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { confirmMockPayment } from "@/lib/payments/service";
import { createClient, createServiceClient } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    providerPaymentId?: string;
  };

  if (!body.providerPaymentId) {
    return NextResponse.json({ error: "缺少支付单号" }, { status: 400 });
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("amount_cents, order_id, provider_transaction_id, status")
    .eq("provider", "mock")
    .eq("provider_transaction_id", body.providerPaymentId)
    .single();

  if (error || !payment?.provider_transaction_id) {
    return NextResponse.json({ error: "支付单不存在" }, { status: 404 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("id", payment.order_id)
    .single();

  if (order?.customer_id !== user.id) {
    return NextResponse.json({ error: "无权确认该支付单" }, { status: 403 });
  }

  const provider = new MockPaymentProvider();
  provider.seedPayment({
    amountCents: payment.amount_cents,
    providerPaymentId: payment.provider_transaction_id,
    status: payment.status === "closed" ? "closed" : "pending",
  });

  try {
    const result = await confirmMockPayment(supabase, provider, {
      providerPaymentId: body.providerPaymentId,
    });

    return NextResponse.json(result);
  } catch (confirmError) {
    const message =
      confirmError instanceof Error ? confirmError.message : "确认支付失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
