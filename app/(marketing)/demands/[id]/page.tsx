import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "需求详情 | 码上好",
    description: "查看已通过审核的软件开发需求详情。",
    alternates: { canonical: `/demands/${id}` },
  };
}

export default async function DemandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: demand } = await supabase
    .from("demands")
    .select(
      "title, description, project_type, cooperation_mode, budget_min_cents, budget_max_cents, expected_delivery_days, published_at",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!demand) {
    notFound();
  }

  return (
    <main className="marketing-page">
      <Card className="profile-card">
        <span className="status-badge">已审核</span>
        <h1>{demand.title}</h1>
        <p>{demand.description}</p>
        <div className="profile-summary">
          <p>项目类型：{demand.project_type}</p>
          <p>合作方式：{demand.cooperation_mode}</p>
          <p>
            预算：
            {currency.format(demand.budget_min_cents / 100)} -{" "}
            {currency.format(demand.budget_max_cents / 100)}
          </p>
          <p>期望周期：{demand.expected_delivery_days} 天</p>
        </div>
      </Card>
    </main>
  );
}
