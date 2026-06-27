import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import {
  getWorkspaceDisputeDetail,
  listWorkspaceDisputeEvidence,
} from "@/lib/domain/disputes/service";
import { createClient } from "@/lib/auth/server";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dispute = await getWorkspaceDisputeDetail(supabase, id);

  if (!dispute) {
    redirect("/workspace/settings");
  }

  const evidence = await listWorkspaceDisputeEvidence(supabase, id);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">订单仲裁</p>
        <h1>争议详情</h1>
        <p className="auth-intro">
          平台会依据双方陈述、证据和交付记录做出继续履约、验收结算或全额退款裁决。
        </p>
      </div>

      <Card className="settings-card">
        <span className="status-badge">{dispute.status}</span>
        <p>订单号：{dispute.order_id}</p>
        <p>发起人：{dispute.opened_by}</p>
        <p>诉求：{dispute.requested_resolution}</p>
        <p>原因：{dispute.reason}</p>
        {dispute.resolution_notes ? (
          <p>裁决说明：{dispute.resolution_notes}</p>
        ) : null}
      </Card>

      <Card className="settings-card">
        <h2>证据材料</h2>
        {evidence?.length ? (
          <div className="workspace-list">
            {evidence.map((item) => (
              <article className="message-preview" key={item.id}>
                <strong>{item.storage_path}</strong>
                {item.description ? <p>{item.description}</p> : null}
                <p>提交人：{item.submitted_by}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>暂无证据材料。</p>
        )}
      </Card>
    </div>
  );
}
