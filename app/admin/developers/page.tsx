import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reviewDeveloperProfile } from "@/lib/domain/admin/governance";
import {
  listAdminDevelopers,
  listDeveloperReviewAuditLogs,
} from "@/lib/domain/admin/queries";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

async function reviewDeveloperAction(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const result = await reviewDeveloperProfile(createServiceClient(), {
    adminId: admin.id,
    decision: String(formData.get("decision") ?? ""),
    developerId: String(formData.get("developerId") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!result.ok) {
    redirect("/admin/developers?error=missing_note");
  }

  revalidatePath("/admin/developers");
  redirect(`/admin/developers?reviewed=${result.entityId}`);
}

export default async function AdminDevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reviewed?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const service = createServiceClient();
  const [developers, auditLogs] = await Promise.all([
    listAdminDevelopers(service),
    listDeveloperReviewAuditLogs(service),
  ]);
  const auditNoteByDeveloperId = new Map(
    auditLogs
      ?.map((log) => {
        const metadata = log.metadata;
        const note =
          metadata && typeof metadata === "object" && !Array.isArray(metadata)
            ? (metadata as { note?: unknown }).note
            : undefined;

        return typeof note === "string" ? [log.entity_id, note] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)) ?? [],
  );

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>开发者审核</h1>
        <p className="auth-intro">审核资料必须填写通过备注或拒绝原因。</p>
      </div>

      {query.error ? <p className="auth-message">请填写审核备注。</p> : null}
      {query.reviewed ? (
        <p className="auth-message">已审核开发者：{query.reviewed}</p>
      ) : null}

      <div className="workspace-list">
        {developers?.map((developer) => (
          <Card className="settings-card" key={developer.user_id}>
            <span className="status-badge">{developer.review_status}</span>
            <h2>{developer.display_name ?? developer.headline ?? developer.user_id}</h2>
            <p>{developer.bio ?? "暂无简介"}</p>
            {auditNoteByDeveloperId.get(developer.user_id) ? (
              <p>{auditNoteByDeveloperId.get(developer.user_id)}</p>
            ) : null}
            {developer.rejection_reason ? (
              <p>拒绝原因：{developer.rejection_reason}</p>
            ) : null}
            <form action={reviewDeveloperAction} className="auth-form">
              <input name="developerId" type="hidden" value={developer.user_id} />
              <label htmlFor={`note-${developer.user_id}`}>
                审核备注-{developer.user_id}
              </label>
              <textarea id={`note-${developer.user_id}`} name="note" required rows={3} />
              <div className="button-row">
                <Button
                  aria-label={`通过开发者-${developer.user_id}`}
                  name="decision"
                  type="submit"
                  value="approve"
                >
                  通过
                </Button>
                <Button
                  aria-label={`拒绝开发者-${developer.user_id}`}
                  name="decision"
                  type="submit"
                  value="reject"
                  variant="secondary"
                >
                  拒绝
                </Button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </main>
  );
}
