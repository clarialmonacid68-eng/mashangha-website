import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  recordPaymentReview,
  setUserSuspension,
} from "@/lib/domain/admin/governance";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/security/audit";

async function banUser(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const suspended = String(formData.get("suspended") ?? "") === "suspend";

  if (!userId || !note) {
    redirect("/admin/risk?error=missing_note");
  }

  const service = createServiceClient();
  await setUserSuspension(service, { adminId: admin.id, note, suspended, userId });

  revalidatePath("/admin/risk");
  redirect("/admin/risk?updated=1");
}

async function reviewPayment(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!paymentId || !note) {
    redirect("/admin/risk?error=missing_note");
  }

  const service = createServiceClient();
  await recordPaymentReview(service, { adminId: admin.id, note, paymentId });

  revalidatePath("/admin/risk");
  redirect("/admin/risk?reviewed=1");
}

export default async function AdminRiskPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reviewed?: string; updated?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
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
        <p className="auth-intro">
          封禁用户只阻止后续动作，不修改历史财务记录；所有动作写入审计日志。
        </p>
      </div>

      {query.error ? <p className="auth-message">请填写操作原因。</p> : null}
      {query.updated ? <p className="auth-message">已更新用户状态。</p> : null}
      {query.reviewed ? (
        <p className="auth-message">已记录支付人工核对。</p>
      ) : null}

      <Card className="settings-card">
        <h2>封禁 / 解封用户</h2>
        <form action={banUser} className="auth-form">
          <label htmlFor="ban-user-id">用户账号 ID</label>
          <input id="ban-user-id" name="userId" required />
          <label htmlFor="ban-note">操作原因</label>
          <textarea id="ban-note" name="note" required rows={2} />
          <div className="button-row">
            <Button name="suspended" type="submit" value="suspend">
              封禁用户
            </Button>
            <Button
              name="suspended"
              type="submit"
              value="unsuspend"
              variant="secondary"
            >
              解封用户
            </Button>
          </div>
        </form>
      </Card>

      <Card className="settings-card">
        <h2>当前封禁用户</h2>
        {suspendedUsers?.length ? (
          suspendedUsers.map((user) => (
            <p key={user.id}>
              {user.display_name ?? user.id}（{user.id}）
            </p>
          ))
        ) : (
          <p>暂无封禁用户。</p>
        )}
      </Card>

      <Card className="settings-card">
        <h2>异常支付</h2>
        {abnormalPayments?.length ? (
          abnormalPayments.map((payment) => (
            <div className="message-preview" key={payment.id}>
              <strong>
                {payment.provider} / {payment.status}
              </strong>
              <p>订单：{payment.order_id}</p>
              <p>支付单：{payment.id}</p>
              <form action={reviewPayment} className="auth-form">
                <input name="paymentId" type="hidden" value={payment.id} />
                <label htmlFor={`payment-note-${payment.id}`}>
                  人工核对结论
                </label>
                <textarea
                  id={`payment-note-${payment.id}`}
                  name="note"
                  required
                  rows={2}
                />
                <Button type="submit" variant="secondary">
                  标记已人工核对
                </Button>
              </form>
            </div>
          ))
        ) : (
          <p>暂无异常支付。</p>
        )}
      </Card>
    </main>
  );
}
