import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import {
  demandProjectTypes,
  type DemandFilters,
} from "@/lib/domain/demands/schema";
import { listPublishedDemands } from "@/lib/domain/demands/service";
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

function parseCents(value?: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : undefined;
}

function parseDays(value?: string) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : undefined;
}

function parseProjectType(value?: string): DemandFilters["projectType"] {
  return demandProjectTypes.includes(
    value as (typeof demandProjectTypes)[number],
  )
    ? (value as DemandFilters["projectType"])
    : undefined;
}

export default async function DemandsPage({
  searchParams,
}: {
  searchParams: Promise<{
    budget?: string;
    keyword?: string;
    projectType?: string;
    publishedWithinDays?: string;
    cycle?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const demands = await listPublishedDemands(supabase, {
    budgetMaxCents: parseCents(params.budget),
    keyword: params.keyword,
    maxDeliveryDays: parseDays(params.cycle),
    projectType: parseProjectType(params.projectType),
    publishedWithinDays: parseDays(params.publishedWithinDays),
  });

  return (
    <main className="marketing-page">
      <header className="marketplace-heading">
        <span className="eyebrow">公开需求</span>
        <h1>需求市场</h1>
        <p>这里只展示通过平台审核、仍可了解和报价的需求。</p>
      </header>

      <form action="/demands" className="marketplace-filters">
        <input
          defaultValue={params.keyword}
          name="keyword"
          placeholder="搜索关键词"
        />
        <select defaultValue={params.projectType ?? ""} name="projectType">
          <option value="">全部类型</option>
          <option value="ai_app">AI 应用</option>
          <option value="digital_employee">数字员工定制</option>
          <option value="mini_program">小程序</option>
          <option value="website">网站建设</option>
          <option value="automation">自动化工具</option>
          <option value="other">其他</option>
        </select>
        <input
          defaultValue={params.budget}
          min={1}
          name="budget"
          placeholder="最高预算（元）"
          type="number"
        />
        <input
          defaultValue={params.cycle}
          min={1}
          name="cycle"
          placeholder="最长周期（天）"
          type="number"
        />
        <select
          defaultValue={params.publishedWithinDays ?? ""}
          name="publishedWithinDays"
        >
          <option value="">不限发布时间</option>
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
        </select>
        <button type="submit">筛选需求</button>
      </form>

      {demands?.length ? (
        <div className="marketplace-grid">
          {demands.map((demand) => (
            <Link href={`/demands/${demand.id}`} key={demand.id}>
              <Card className="marketplace-card">
                <span className="status-badge">已审核</span>
                <h2>{demand.title}</h2>
                <p>{demand.description}</p>
                <strong>
                  {currency.format(demand.budget_min_cents / 100)} -{" "}
                  {currency.format(demand.budget_max_cents / 100)}
                </strong>
                <p>{demand.expected_delivery_days} 天内交付</p>
              </Card>
            </Link>
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
