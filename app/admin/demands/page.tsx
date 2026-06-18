import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setDemandSuspension } from "@/lib/domain/admin/governance";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin, writeAuditLog } from "@/lib/security/audit";

async function reviewDemand(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const demandId = String(formData.get("demandId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!demandId || !["approve", "reject"].includes(decision) || !note) {
    redirect("/admin/demands?error=missing_note");
  }

  const service = createServiceClient();
  const { error } = await service
    .from("demands")
    .update({
      published_at: decision === "approve" ? new Date().toISOString() : null,
      review_notes: note,
      status: decision === "approve" ? "published" : "closed",
    })
    .eq("id", demandId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: decision === "approve" ? "demand.approve" : "demand.reject",
    actorId: admin.id,
    entityId: demandId,
    entityType: "demand",
    metadata: { note },
  });

  revalidatePath("/admin/demands");
  redirect(`/admin/demands?reviewed=${demandId}`);
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
  const service = createServiceClient();
  const { data: demands } = await service
    .from("demands")
    .select(
      "id, title, description, status, review_notes, is_suspended, customer_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

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
            <form action={reviewDemand} className="auth-form">
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
