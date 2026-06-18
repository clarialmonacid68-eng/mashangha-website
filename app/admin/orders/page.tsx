import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setOrderFrozen } from "@/lib/domain/admin/governance";
import { executeOrderRefund } from "@/lib/domain/refunds/service";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

async function toggleFreeze(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const frozen = String(formData.get("frozen") ?? "") === "freeze";
  const note = String(formData.get("note") ?? "").trim();

  if (!orderId || !note) {
    redirect("/admin/orders?error=missing_note");
  }

  const service = createServiceClient();
  await setOrderFrozen(service, { adminId: admin.id, frozen, note, orderId });

  revalidatePath("/admin/orders");
  redirect(`/admin/orders?updated=${orderId}`);
}

async function runRefund(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!orderId || !reason) {
    redirect("/admin/orders?error=missing_note");
  }

  const service = createServiceClient();
  const result = await executeOrderRefund(service, new MockPaymentProvider(), {
    adminId: admin.id,
    orderId,
    reason,
  });

  revalidatePath("/admin/orders");
  redirect(
    `/admin/orders?refund=${result.status}&order=${orderId}`,
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    order?: string;
    refund?: string;
    updated?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const service = createServiceClient();
  const { data: orders } = await service
    .from("orders")
    .select(
      "id, status, amount_cents, customer_id, developer_id, paid_at, is_frozen, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>订单中心</h1>
        <p className="auth-intro">
          查看订单状态与参与者，必要时冻结订单以阻止新动作（不影响历史财务记录）。
        </p>
      </div>
      {query.error ? <p className="auth-message">请填写操作原因。</p> : null}
      {query.updated ? (
        <p className="auth-message">已更新订单：{query.updated}</p>
      ) : null}
      {query.refund === "succeeded" ? (
        <p className="auth-message">退款已完成：{query.order}</p>
      ) : null}
      {query.refund === "failed" ? (
        <p className="auth-message">
          退款失败，订单已退回退款审核，可填写原因后重试：{query.order}
        </p>
      ) : null}
      <div className="workspace-list">
        {orders?.map((order) => (
          <Card className="settings-card" key={order.id}>
            <span className="status-badge">{order.status}</span>
            <h2>{order.id}</h2>
            <p>金额：¥{Math.round(order.amount_cents / 100).toLocaleString("zh-CN")}</p>
            <p>客户：{order.customer_id}</p>
            <p>开发者：{order.developer_id}</p>
            <p>冻结状态：{order.is_frozen ? "已冻结" : "正常"}</p>
            {order.paid_at ? <p>支付时间：{order.paid_at}</p> : null}
            <form action={toggleFreeze} className="auth-form">
              <input name="orderId" type="hidden" value={order.id} />
              <input
                name="frozen"
                type="hidden"
                value={order.is_frozen ? "unfreeze" : "freeze"}
              />
              <label htmlFor={`order-note-${order.id}`}>操作原因</label>
              <textarea
                id={`order-note-${order.id}`}
                name="note"
                required
                rows={2}
              />
              <Button
                type="submit"
                variant={order.is_frozen ? "secondary" : "primary"}
              >
                {order.is_frozen ? "解除冻结" : "冻结订单"}
              </Button>
            </form>
            {order.status === "refund_review" ? (
              <form action={runRefund} className="auth-form">
                <input name="orderId" type="hidden" value={order.id} />
                <label htmlFor={`refund-reason-${order.id}`}>
                  退款原因（失败后可重试）
                </label>
                <textarea
                  id={`refund-reason-${order.id}`}
                  name="reason"
                  required
                  rows={2}
                />
                <Button type="submit">执行全额退款（模拟）</Button>
              </form>
            ) : null}
          </Card>
        ))}
      </div>
    </main>
  );
}
