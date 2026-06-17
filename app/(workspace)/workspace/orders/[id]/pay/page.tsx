import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { confirmMockPayment, createOrderPayment } from "@/lib/payments/service";
import { createClient, createServiceClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

async function createPayment(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const agreed = formData.get("agreed") === "on";

  if (!agreed) {
    redirect(`/workspace/orders/${orderId}/pay?error=rules_required`);
  }

  const supabase = await createClient();
  let providerPaymentId: string;

  try {
    const result = await createOrderPayment(supabase, new MockPaymentProvider(), {
      idempotencyKey: `pay-${orderId}`,
      orderId,
    });
    providerPaymentId = result.providerPayment.providerPaymentId;
  } catch {
    redirect(`/workspace/orders/${orderId}/pay?error=create_failed`);
  }

  redirect(
    `/workspace/orders/${orderId}/pay?payment=${encodeURIComponent(
      providerPaymentId,
    )}`,
  );
}

async function confirmPayment(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const providerPaymentId = String(formData.get("providerPaymentId") ?? "");

  if (!providerPaymentId) {
    redirect(`/workspace/orders/${orderId}/pay?error=confirm_failed`);
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const service = createServiceClient();
  const { data: payment } = await service
    .from("payments")
    .select("amount_cents, order_id, provider_transaction_id, status")
    .eq("provider", "mock")
    .eq("provider_transaction_id", providerPaymentId)
    .single();

  if (!payment || payment.order_id !== orderId) {
    redirect(`/workspace/orders/${orderId}/pay?error=confirm_failed`);
  }

  const { data: order } = await service
    .from("orders")
    .select("customer_id")
    .eq("id", payment.order_id)
    .single();

  if (order?.customer_id !== user.id) {
    redirect("/workspace/settings");
  }

  const provider = new MockPaymentProvider();
  provider.seedPayment({
    amountCents: payment.amount_cents,
    providerPaymentId,
    status: payment.status === "closed" ? "closed" : "pending",
  });

  try {
    await confirmMockPayment(service, provider, { providerPaymentId });
  } catch {
    redirect(
      `/workspace/orders/${orderId}/pay?payment=${encodeURIComponent(
        providerPaymentId,
      )}&error=confirm_failed`,
    );
  }

  redirect(`/workspace/orders/${orderId}?payment=confirmed`);
}

export default async function OrderPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; payment?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, amount_cents, status, developer_id, customer_id")
    .eq("id", id)
    .single();

  if (!order || order.customer_id !== user.id) {
    redirect("/workspace/settings");
  }

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">订单付款</p>
        <h1>全额付款</h1>
        <p className="auth-intro">
          当前为模拟支付流程，真实渠道接入前不会产生实际扣款。
        </p>
      </div>

      <Card className="settings-card">
        {query.error === "rules_required" ? (
          <p className="auth-message">请先确认平台付款规则。</p>
        ) : null}
        {query.error === "create_failed" ? (
          <p className="auth-message">创建支付单失败，请稍后重试。</p>
        ) : null}
        {query.error === "confirm_failed" ? (
          <p className="auth-message">确认模拟支付失败，请稍后重试。</p>
        ) : null}
        {query.payment ? (
          <p className="auth-message">模拟支付单已创建：{query.payment}</p>
        ) : null}

        <p className="application-label">订单金额</p>
        <strong>{currency.format(order.amount_cents / 100)}</strong>
        <p>订单状态：{order.status}</p>
        <p>开发者账号：{order.developer_id}</p>

        {order.status === "pending_payment" ? (
          <form action={createPayment} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <label className="checkbox-line">
              <input name="agreed" required type="checkbox" />
              我确认采用全额付款模式，并理解当前为本地模拟支付。
            </label>
            <Button type="submit">创建模拟支付单</Button>
          </form>
        ) : (
          <p className="auth-message">该订单当前无需付款。</p>
        )}
        {order.status === "pending_payment" && query.payment ? (
          <form action={confirmPayment} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <input
              name="providerPaymentId"
              type="hidden"
              value={query.payment}
            />
            <Button type="submit">确认模拟支付</Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
