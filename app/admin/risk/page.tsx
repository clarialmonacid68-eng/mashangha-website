import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

export default async function AdminRiskPage() {
  await requireAdmin();
  const service = createServiceClient();
  const [{ data: suspendedUsers }, { data: abnormalPayments }] =
    await Promise.all([
      service
        .from("profiles")
        .select("id, display_name, is_suspended, updated_at")
        .eq("is_suspended", true)
        .limit(20),
      service
        .from("payments")
        .select("id, order_id, status, amount_cents, provider, updated_at")
        .in("status", ["failed", "closed"])
        .limit(20),
    ]);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>风控基础</h1>
        <p className="auth-intro">第一期展示封禁用户与异常支付，冻结动作后续接入高风险二次确认。</p>
      </div>
      <Card className="settings-card">
        <h2>封禁用户</h2>
        {suspendedUsers?.length ? (
          suspendedUsers.map((user) => <p key={user.id}>{user.display_name ?? user.id}</p>)
        ) : (
          <p>暂无封禁用户。</p>
        )}
      </Card>
      <Card className="settings-card">
        <h2>异常支付</h2>
        {abnormalPayments?.length ? (
          abnormalPayments.map((payment) => (
            <p key={payment.id}>
              {payment.provider} / {payment.status} / {payment.order_id}
            </p>
          ))
        ) : (
          <p>暂无异常支付。</p>
        )}
      </Card>
    </main>
  );
}
