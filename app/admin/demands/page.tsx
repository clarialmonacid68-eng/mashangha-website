import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reviewDemand, setDemandSuspension } from "@/lib/domain/admin/governance";
import { listAdminDemands } from "@/lib/domain/admin/queries";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

async function reviewDemandAction(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const result = await reviewDemand(createServiceClient(), {
    adminId: admin.id,
    decision: String(formData.get("decision") ?? ""),
    demandId: String(formData.get("demandId") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!result.ok) {
    redirect("/admin/demands?error=missing_note");
  }

  revalidatePath("/admin/demands");
  redirect(`/admin/demands?reviewed=${result.entityId}`);
}

async function toggleSuspension(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const demandId = String(formData.get("demandId") ?? "");
  const suspended = String(formData.get("suspended") ?? "") === "suspend";
  const note = String(formData.get("note") ?? "").trim();

  if (!demandId || !note) {
    redirect("/admin/demands?error=missing_note");
  }

  const service = createServiceClient();
  await setDemandSuspension(service, {
    adminId: admin.id,
    demandId,
    note,
    suspended,
  });

  revalidatePath("/admin/demands");
  redirect(`/admin/demands?reviewed=${demandId}`);
}

export default async function AdminDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reviewed?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const demands = await listAdminDemands(createServiceClient());

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>需求审核</h1>
        <p className="auth-intro">审核需求必须填写通过备注或拒绝原因。</p>
      </div>
      {query.error ? <p className="auth-message">请填写审核备注。</p> : null}
      {query.reviewed ? <p className="auth-message">已审核需求：{query.reviewed}</p> : null}
      <div className="workspace-list">
        {demands?.map((demand) => (
          <Card className="settings-card" key={demand.id}>
            <span className="status-badge">{demand.status}</span>
            <h2>{demand.title}</h2>
            <p>{demand.description}</p>
            {demand.review_notes ? <p>审核备注：{demand.review_notes}</p> : null}
            <p>展示状态：{demand.is_suspended ? "已暂停下架" : "正常"}</p>
            <form action={reviewDemandAction} className="auth-form">
              <input name="demandId" type="hidden" value={demand.id} />
              <label htmlFor={`demand-note-${demand.id}`}>审核备注</label>
              <textarea id={`demand-note-${demand.id}`} name="note" required rows={3} />
              <div className="button-row">
                <Button name="decision" type="submit" value="approve">
                  发布
                </Button>
                <Button name="decision" type="submit" value="reject" variant="secondary">
                  拒绝
                </Button>
              </div>
            </form>
            <form action={toggleSuspension} className="auth-form">
              <input name="demandId" type="hidden" value={demand.id} />
              <input
                name="suspended"
                type="hidden"
                value={demand.is_suspended ? "resume" : "suspend"}
              />
              <label htmlFor={`demand-suspend-note-${demand.id}`}>
                暂停 / 恢复原因
              </label>
              <textarea
                id={`demand-suspend-note-${demand.id}`}
                name="note"
                required
                rows={2}
              />
              <Button type="submit" variant="secondary">
                {demand.is_suspended ? "恢复展示" : "暂停下架"}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </main>
  );
}
