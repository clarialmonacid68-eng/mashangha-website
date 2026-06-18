import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPublishedDemands } from "@/lib/domain/demands/service";
import { createQuote } from "@/lib/domain/quotes/service";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

async function submitQuote(formData: FormData) {
  "use server";

  const demandId = String(formData.get("demandId") ?? "");
  const amountYuan = Number(formData.get("amountYuan") ?? 0);
  const deliveryDays = Number(formData.get("deliveryDays") ?? 0);
  const validDays = Number(formData.get("validDays") ?? 0);
  const proposal = String(formData.get("proposal") ?? "");
  const supabase = await createClient();

  const expiresAt = new Date(
    Date.now() + Math.max(1, validDays) * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    await createQuote(supabase, demandId, {
      amountCents: Math.round(amountYuan * 100),
      deliveryDays,
      expiresAt,
      proposal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交报价失败";
    redirect(`/workspace/developer/demands?error=${encodeURIComponent(message)}`);
  }

  redirect(`/workspace/developer/demands?quoted=${demandId}`);
}

export default async function DeveloperDemandsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; quoted?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const demands = await listPublishedDemands(supabase, {});

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">开发者工作台</p>
        <h1>可报价需求</h1>
        <p className="auth-intro">
          只有通过认证的开发者可以报价；同一需求只能提交一份有效报价。
        </p>
      </div>

      {query.error ? (
        <p className="auth-message">{decodeURIComponent(query.error)}</p>
      ) : null}
      {query.quoted ? <p className="auth-message">报价已提交。</p> : null}

      {demands.length ? (
        <div className="workspace-list">
          {demands.map((demand) => (
            <Card className="settings-card" key={demand.id}>
              <span className="status-badge">已审核</span>
              <h2>{demand.title}</h2>
              <p>{demand.description}</p>
              <p>
                预算：{currency.format(demand.budget_min_cents / 100)} -{" "}
                {currency.format(demand.budget_max_cents / 100)} · 期望{" "}
                {demand.expected_delivery_days} 天
              </p>
              <form action={submitQuote} className="auth-form">
                <input name="demandId" type="hidden" value={demand.id} />
                <label htmlFor={`amount-${demand.id}`}>报价金额（元）</label>
                <input
                  id={`amount-${demand.id}`}
                  min={1}
                  name="amountYuan"
                  required
                  type="number"
                />
                <label htmlFor={`days-${demand.id}`}>预计工期（天）</label>
                <input
                  id={`days-${demand.id}`}
                  min={1}
                  name="deliveryDays"
                  required
                  type="number"
                />
                <label htmlFor={`valid-${demand.id}`}>报价有效期（天）</label>
                <input
                  defaultValue={14}
                  id={`valid-${demand.id}`}
                  min={1}
                  name="validDays"
                  required
                  type="number"
                />
                <label htmlFor={`proposal-${demand.id}`}>方案说明</label>
                <textarea
                  id={`proposal-${demand.id}`}
                  name="proposal"
                  required
                  rows={4}
                />
                <Button type="submit">提交报价</Button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>暂时没有可报价的需求</h2>
          <p>有新的已审核需求时会显示在这里。</p>
        </Card>
      )}
    </div>
  );
}
