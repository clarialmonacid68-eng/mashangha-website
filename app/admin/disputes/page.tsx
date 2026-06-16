import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

export default async function AdminDisputesPage() {
  await requireAdmin();
  const service = createServiceClient();
  const { data: disputes } = await service
    .from("disputes")
    .select("id, order_id, status, reason, requested_resolution, opened_by, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>争议中心</h1>
        <p className="auth-intro">查看争议原因、诉求和证据；裁决动作将在真实退款模型完成后接入。</p>
      </div>
      <div className="workspace-list">
        {disputes?.map((dispute) => (
          <Card className="settings-card" key={dispute.id}>
            <span className="status-badge">{dispute.status}</span>
            <h2>{dispute.order_id}</h2>
            <p>发起人：{dispute.opened_by}</p>
            <p>诉求：{dispute.requested_resolution}</p>
            <p>{dispute.reason}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
