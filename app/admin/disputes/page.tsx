import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveDisputeByDecision } from "@/lib/domain/disputes/service";
import { listAdminDisputes } from "@/lib/domain/admin/queries";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

async function ruleDispute(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const result = await resolveDisputeByDecision(createServiceClient(), {
    adminId: admin.id,
    decision: String(formData.get("decision") ?? ""),
    disputeId: String(formData.get("disputeId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!result.ok) {
    redirect("/admin/disputes?error=missing_note");
  }

  revalidatePath("/admin/disputes");
  redirect(`/admin/disputes?resolved=${result.disputeId}`);
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; resolved?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const disputes = await listAdminDisputes(createServiceClient());

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>争议中心</h1>
        <p className="auth-intro">
          第一阶段裁决只允许三类结论：继续履约、验收结算、全额退款。裁决必须填写依据并写入审计日志。
        </p>
      </div>
      {query.error ? <p className="auth-message">请填写裁决说明。</p> : null}
      {query.resolved ? (
        <p className="auth-message">已裁决争议：{query.resolved}</p>
      ) : null}
      <div className="workspace-list">
        {disputes?.map((dispute) => {
          const open = dispute.status === "open" || dispute.status === "investigating";
          return (
            <Card className="settings-card" key={dispute.id}>
              <span className="status-badge">{dispute.status}</span>
              <h2>{dispute.order_id}</h2>
              <p>发起人：{dispute.opened_by}</p>
              <p>诉求：{dispute.requested_resolution}</p>
              <p>{dispute.reason}</p>
              {dispute.resolution_notes ? (
                <p>裁决说明：{dispute.resolution_notes}</p>
              ) : null}
              {open ? (
                <form action={ruleDispute} className="auth-form">
                  <input name="disputeId" type="hidden" value={dispute.id} />
                  <label htmlFor={`dispute-notes-${dispute.id}`}>裁决说明</label>
                  <textarea
                    id={`dispute-notes-${dispute.id}`}
                    name="notes"
                    required
                    rows={3}
                  />
                  <div className="button-row">
                    <Button name="decision" type="submit" value="continue">
                      继续履约
                    </Button>
                    <Button
                      name="decision"
                      type="submit"
                      value="accept"
                      variant="secondary"
                    >
                      验收结算
                    </Button>
                    <Button
                      name="decision"
                      type="submit"
                      value="refund"
                      variant="secondary"
                    >
                      全额退款
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="auth-message">该争议已结案。</p>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
