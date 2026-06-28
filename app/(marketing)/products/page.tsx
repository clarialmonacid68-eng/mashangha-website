import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import {
  productCategories,
  productCategoryLabels,
} from "@/lib/domain/products/schema";
import { listPublishedProducts } from "@/lib/domain/products/service";
import { createClient } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "AI 应用市场 | 码上好",
  description: "选购开发者上架、经平台审核的现成 AI 应用与工具，付款后获取授权码或访问链接。",
  alternates: { canonical: "/products" },
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

function parseCategory(value?: string) {
  return productCategories.includes(value as (typeof productCategories)[number])
    ? value
    : undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; keyword?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const products = await listPublishedProducts(supabase, {
    category: parseCategory(params.category),
    keyword: params.keyword,
  });

  return (
    <main className="marketing-page">
      <header className="marketplace-heading">
        <span className="eyebrow">AI 应用市场</span>
        <h1>即买即用的 AI 应用</h1>
        <p>
          由认证开发者上架、经平台审核公开。付款后获取授权码或访问链接。当前为模拟付款流程，真实支付能力上线前不会产生实际扣款。
        </p>
      </header>

      <form action="/products" className="marketplace-filters">
        <input
          defaultValue={params.keyword}
          name="keyword"
          placeholder="搜索关键词"
        />
        <select defaultValue={params.category ?? ""} name="category">
          <option value="">全部类别</option>
          {productCategories.map((category) => (
            <option key={category} value={category}>
              {productCategoryLabels[category]}
            </option>
          ))}
        </select>
        <button type="submit">筛选</button>
      </form>

      {products.length ? (
        <div className="marketplace-grid">
          {products.map((product) => (
            <Link href={`/products/${product.id}`} key={product.id}>
              <Card className="marketplace-card">
                <span className="status-badge">
                  {productCategoryLabels[
                    product.category as keyof typeof productCategoryLabels
                  ] ?? product.category}
                </span>
                <h2>{product.title}</h2>
                <p>{product.summary}</p>
                <strong>{currency.format(product.price_cents / 100)}</strong>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="empty-state">
          <h2>暂时没有上架的 AI 应用</h2>
          <p>开发者上架并通过审核后会显示在这里，不使用演示数据填充。</p>
        </Card>
      )}
    </main>
  );
}
