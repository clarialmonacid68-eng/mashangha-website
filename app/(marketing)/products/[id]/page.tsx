import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { productCategoryLabels } from "@/lib/domain/products/schema";
import {
  getPublishedProduct,
  purchaseProduct,
} from "@/lib/domain/products/service";
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
    title: "AI 应用详情 | 码上好",
    description: "查看已审核上架的 AI 应用详情并下单购买。",
    alternates: { canonical: `/products/${id}` },
  };
}

async function startPurchase(formData: FormData) {
  "use server";

  const productId = String(formData.get("productId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await purchaseProduct(supabase, productId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "下单失败";
    if (message.includes("Authentication")) {
      redirect("/login");
    }
    redirect(`/products/${productId}?error=${encodeURIComponent(message)}`);
  }

  redirect("/workspace/purchases?created=1");
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const product = await getPublishedProduct(supabase, id);

  if (!product) {
    notFound();
  }

  return (
    <main className="marketing-page">
      <Card className="profile-card">
        <span className="status-badge">
          {productCategoryLabels[
            product.category as keyof typeof productCategoryLabels
          ] ?? product.category}
        </span>
        <h1>{product.title}</h1>
        <p>{product.summary}</p>
        <div className="profile-summary">
          <p>{product.description}</p>
          <strong>{currency.format(product.price_cents / 100)}</strong>
          <p className="profile-note">
            交付方式：付款后获取授权码或访问链接。当前为模拟付款，真实支付上线前不会实际扣款。
          </p>
        </div>

        {query.error ? (
          <p className="auth-message">{decodeURIComponent(query.error)}</p>
        ) : null}

        <form action={startPurchase}>
          <input name="productId" type="hidden" value={product.id} />
          <Button type="submit">立即购买（模拟）</Button>
        </form>
      </Card>
    </main>
  );
}
