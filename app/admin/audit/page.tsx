import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

export default async function AdminAuditPage() {
  await requireAdmin();
  const service = createServiceClient();
  const { data: logs } = await service
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>审计日志</h1>
        <p className="auth-intro">记录后台高风险操作、审核动作和原因。</p>
      </div>
      <div className="workspace-list">
        {logs?.map((log) => (
          <Card className="settings-card" key={log.id}>
            <span className="status-badge">{log.action}</span>
            <h2>{log.entity_type}</h2>
            <p>实体：{log.entity_id}</p>
            <p>操作人：{log.actor_id}</p>
            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
          </Card>
        ))}
      </div>
    </main>
  );
}
