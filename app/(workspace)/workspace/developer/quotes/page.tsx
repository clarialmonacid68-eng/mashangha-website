import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export default async function DeveloperQuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, amount_cents, delivery_days, proposal, status, expires_at, demands(title)")
    .eq("developer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">开发者工作台</p>
        <h1>我的报价</h1>
        <p className="auth-intro">查看已提交报价的状态和客户选择结果。</p>
      </div>

      {quotes?.length ? (
        <div className="workspace-list">
          {quotes.map((quote) => (
            <Card className="settings-card" key={quote.id}>
              <span className="status-badge">{quote.status}</span>
              <h2>{quote.demands?.title ?? "需求"}</h2>
              <p>{quote.proposal}</p>
              <p>
                {currency.format(quote.amount_cents / 100)} /{" "}
                {quote.delivery_days} 天
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有提交报价</h2>
          <p>审核通过后，可以在公开需求详情中提交方案。</p>
        </Card>
      )}
    </div>
  );
}
