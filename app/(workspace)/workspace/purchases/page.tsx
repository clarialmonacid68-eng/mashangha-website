import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmProductPurchase } from "@/lib/domain/products/service";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

async function confirmPurchase(formData: FormData) {
  "use server";

  const purchaseId = String(formData.get("purchaseId") ?? "");
  const supabase = await createClient();

  try {
    await confirmProductPurchase(supabase, purchaseId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "确认付款失败";
    redirect(`/workspace/purchases?error=${encodeURIComponent(message)}`);
  }

  redirect("/workspace/purchases?paid=1");
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; paid?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: purchases } = await supabase
    .from("product_purchases")
    .select(
      "id, product_id, amount_cents, status, delivered_payload, created_at, products(title)",
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">工作台</p>
        <h1>我的购买</h1>
        <p className="auth-intro">
          AI 应用市场的购买记录。当前为模拟付款，确认后即可查看授权码或访问链接。
        </p>
      </div>

      {query.created ? (
        <p className="auth-message">已创建订单，请确认模拟付款。</p>
      ) : null}
      {query.paid ? <p className="auth-message">付款已确认。</p> : null}
      {query.error ? (
        <p className="auth-message">{decodeURIComponent(query.error)}</p>
      ) : null}

      {purchases?.length ? (
        <div className="workspace-list">
          {purchases.map((purchase) => (
            <Card className="settings-card" key={purchase.id}>
              <span className="status-badge">
                {purchase.status === "paid" ? "已付款" : "待付款"}
              </span>
              <h2>{purchase.products?.title ?? "AI 应用"}</h2>
              <p>金额：{currency.format(purchase.amount_cents / 100)}</p>
              {purchase.status === "pending_payment" ? (
                <form action={confirmPurchase} className="auth-form">
                  <input name="purchaseId" type="hidden" value={purchase.id} />
                  <Button type="submit">确认模拟付款</Button>
                </form>
              ) : (
                <div>
                  <p className="application-label">交付内容（授权码 / 链接）</p>
                  <code className="account-id">
                    {purchase.delivered_payload ?? "—"}
                  </code>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有购买记录</h2>
          <p>
            前往 AI 应用市场选购现成的 AI 应用。
          </p>
        </Card>
      )}
    </div>
  );
}
