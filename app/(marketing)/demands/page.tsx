import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "需求市场 | 码上好",
  description: "浏览经过审核、正在接受开发者方案的软件开发需求。",
  alternates: { canonical: "/demands" },
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export default async function DemandsPage() {
  const supabase = await createClient();
  const { data: demands } = await supabase
    .from("demands")
    .select("id, title, description, budget_min_cents, budget_max_cents, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return (
    <main className="marketing-page">
      <header className="marketplace-heading">
        <span className="eyebrow">公开需求</span>
        <h1>需求市场</h1>
        <p>这里只展示通过平台审核、仍可了解和报价的需求。</p>
      </header>

      {demands?.length ? (
        <div className="marketplace-grid">
          {demands.map((demand) => (
            <Card className="marketplace-card" key={demand.id}>
              <span className="status-badge">已审核</span>
              <h2>{demand.title}</h2>
              <p>{demand.description}</p>
              <strong>
                {currency.format(demand.budget_min_cents / 100)} -{" "}
                {currency.format(demand.budget_max_cents / 100)}
              </strong>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="empty-state">
          <h2>暂时没有公开需求</h2>
          <p>需求审核通过后会显示在这里，不使用演示数据填充市场。</p>
          <Link href="/workspace/customer/demands/new">发布第一个真实需求</Link>
        </Card>
      )}
    </main>
  );
}

