import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { listParticipantOrders } from "@/lib/domain/orders/queries";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orders = await listParticipantOrders(supabase);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">工作台</p>
        <h1>我的订单</h1>
        <p className="auth-intro">这里汇总你作为客户或开发者参与的全部订单。</p>
      </div>

      {orders?.length ? (
        <div className="workspace-list">
          {orders.map((order) => {
            const role = order.customer_id === user.id ? "客户" : "开发者";
            return (
              <Card className="settings-card" key={order.id}>
                <span className="status-badge">{order.status}</span>
                <h2>{order.demands?.title ?? "订单"}</h2>
                <p>
                  我的角色：{role} · 金额：
                  {currency.format(order.amount_cents / 100)}
                </p>
                <div className="button-row">
                  <Link href={`/workspace/orders/${order.id}`}>查看订单</Link>
                  {order.customer_id === user.id &&
                  order.status === "pending_payment" ? (
                    <Link href={`/workspace/orders/${order.id}/pay`}>
                      去付款
                    </Link>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有订单</h2>
          <p>客户选标或开发者被选中后，订单会显示在这里。</p>
        </Card>
      )}
    </div>
  );
}
