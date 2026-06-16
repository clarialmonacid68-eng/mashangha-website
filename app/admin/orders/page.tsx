import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const service = createServiceClient();
  const { data: orders } = await service
    .from("orders")
    .select("id, status, amount_cents, customer_id, developer_id, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>订单中心</h1>
        <p className="auth-intro">查看订单状态、参与者、金额和支付时间线。</p>
      </div>
      <div className="workspace-list">
        {orders?.map((order) => (
          <Card className="settings-card" key={order.id}>
            <span className="status-badge">{order.status}</span>
            <h2>{order.id}</h2>
            <p>金额：¥{Math.round(order.amount_cents / 100).toLocaleString("zh-CN")}</p>
            <p>客户：{order.customer_id}</p>
            <p>开发者：{order.developer_id}</p>
            {order.paid_at ? <p>支付时间：{order.paid_at}</p> : null}
          </Card>
        ))}
      </div>
    </main>
  );
}
