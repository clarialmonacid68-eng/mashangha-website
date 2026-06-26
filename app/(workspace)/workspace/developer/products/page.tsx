import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  productCategories,
  productCategoryLabels,
} from "@/lib/domain/products/schema";
import {
  createProductForReview,
  listSellerProducts,
} from "@/lib/domain/products/service";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

const statusLabel: Record<string, string> = {
  draft: "草稿",
  pending_review: "审核中",
  published: "已上架",
  rejected: "已拒绝",
  delisted: "已下架",
};

async function submitProduct(formData: FormData) {
  "use server";

  const supabase = await createClient();

  try {
    await createProductForReview(supabase, {
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(
        formData.get("category") ?? "",
      ) as (typeof productCategories)[number],
      priceYuan: Number(formData.get("priceYuan") ?? 0),
      fulfillment: String(formData.get("fulfillment") ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    redirect(
      `/workspace/developer/products?error=${encodeURIComponent(message)}`,
    );
  }

  redirect("/workspace/developer/products?submitted=1");
}

export default async function DeveloperProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const products = await listSellerProducts(supabase);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">开发者工作台</p>
        <h1>我的 AI 应用</h1>
        <p className="auth-intro">
          上架现成 AI 应用，经平台审核后在 AI 应用市场公开。仅认证开发者可上架。
        </p>
      </div>

      {query.error ? (
        <p className="auth-message">{decodeURIComponent(query.error)}</p>
      ) : null}
      {query.submitted ? (
        <p className="auth-message">已提交审核。</p>
      ) : null}

      <Card className="settings-card">
        <h2>上架新产品</h2>
        <form action={submitProduct} className="auth-form">
          <label htmlFor="title">产品标题</label>
          <input id="title" maxLength={120} minLength={4} name="title" required />
          <label htmlFor="summary">一句话简介</label>
          <input id="summary" maxLength={200} minLength={4} name="summary" required />
          <label htmlFor="description">详细介绍</label>
          <textarea id="description" minLength={20} name="description" required rows={4} />
          <label htmlFor="category">类别</label>
          <select id="category" name="category" required>
            {productCategories.map((category) => (
              <option key={category} value={category}>
                {productCategoryLabels[category]}
              </option>
            ))}
          </select>
          <label htmlFor="priceYuan">价格（元）</label>
          <input id="priceYuan" min={1} name="priceYuan" required type="number" />
          <label htmlFor="fulfillment">交付内容（授权码或访问链接）</label>
          <textarea
            id="fulfillment"
            name="fulfillment"
            placeholder="买家付款后将看到这段内容，例如激活码或开通链接"
            required
            rows={2}
          />
          <Button type="submit">提交上架审核</Button>
        </form>
      </Card>

      {products.length ? (
        <div className="workspace-list">
          {products.map((product) => (
            <Card className="settings-card" key={product.id}>
              <span className="status-badge">
                {statusLabel[product.status] ?? product.status}
                {product.is_suspended ? " · 已下架" : ""}
              </span>
              <h2>{product.title}</h2>
              <p>{product.summary}</p>
              <p>{currency.format(product.price_cents / 100)}</p>
              {product.review_notes ? (
                <p>审核备注：{product.review_notes}</p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有上架产品</h2>
          <p>用上方表单上架你的第一个 AI 应用。</p>
        </Card>
      )}
    </div>
  );
}
