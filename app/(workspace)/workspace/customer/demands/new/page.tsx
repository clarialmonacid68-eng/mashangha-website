import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/server";

function parseBudget(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

async function createDraftDemand(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgetMinCents = parseBudget(formData.get("budgetMin"));
  const budgetMaxCents = parseBudget(formData.get("budgetMax"));
  const expectedDeliveryDate = String(
    formData.get("expectedDeliveryDate") ?? "",
  ).trim();

  if (
    title.length < 4 ||
    description.length < 20 ||
    budgetMinCents === null ||
    budgetMaxCents === null ||
    budgetMaxCents < budgetMinCents
  ) {
    redirect("/workspace/customer/demands/new?error=invalid");
  }

  const { error } = await supabase.from("demands").insert({
    customer_id: user.id,
    title,
    description,
    budget_min_cents: budgetMinCents,
    budget_max_cents: budgetMaxCents,
    expected_delivery_date: expectedDeliveryDate || null,
    status: "draft",
  });

  if (error) {
    redirect("/workspace/customer/demands/new?error=create_failed");
  }

  redirect("/workspace/customer/demands/new?saved=1");
}

export default async function NewDemandPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">客户工作台</p>
        <h1>发布开发需求</h1>
        <p className="auth-intro">
          先保存为草稿，后续审核流程完成后再进入公开需求市场。
        </p>
      </div>

      <Card className="settings-card">
        {params.saved ? (
          <p className="auth-message">需求草稿已保存。</p>
        ) : null}
        {params.error === "invalid" ? (
          <p className="auth-message">
            请填写完整需求，并确认预算上限不低于预算下限。
          </p>
        ) : null}
        {params.error === "create_failed" ? (
          <p className="auth-message">保存失败，请稍后重试。</p>
        ) : null}

        <form action={createDraftDemand} className="auth-form demand-form">
          <label htmlFor="title">需求标题</label>
          <input
            id="title"
            maxLength={120}
            minLength={4}
            name="title"
            placeholder="例如：企业官网接入 AI 客服"
            required
          />

          <label htmlFor="description">需求描述</label>
          <textarea
            id="description"
            minLength={20}
            name="description"
            placeholder="说明业务背景、核心功能、参考链接、交付物和验收标准。"
            required
            rows={6}
          />

          <div className="form-grid">
            <div>
              <label htmlFor="budgetMin">预算下限（元）</label>
              <input
                id="budgetMin"
                min={0}
                name="budgetMin"
                required
                type="number"
              />
            </div>
            <div>
              <label htmlFor="budgetMax">预算上限（元）</label>
              <input
                id="budgetMax"
                min={0}
                name="budgetMax"
                required
                type="number"
              />
            </div>
          </div>

          <label htmlFor="expectedDeliveryDate">期望交付日期</label>
          <input
            id="expectedDeliveryDate"
            name="expectedDeliveryDate"
            type="date"
          />

          <Button type="submit">保存需求草稿</Button>
        </form>
      </Card>
    </div>
  );
}
