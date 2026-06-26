import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { productCategoryLabels } from "@/lib/domain/products/schema";
import { createServiceClient } from "@/lib/auth/server";
import { requireAdmin, writeAuditLog } from "@/lib/security/audit";

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

async function reviewProduct(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!productId || !["approve", "reject"].includes(decision) || !note) {
    redirect("/admin/products?error=missing_note");
  }

  const service = createServiceClient();
  const { error } = await service
    .from("products")
    .update({
      published_at: decision === "approve" ? new Date().toISOString() : null,
      review_notes: note,
      status: decision === "approve" ? "published" : "rejected",
    })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: decision === "approve" ? "product.approve" : "product.reject",
    actorId: admin.id,
    entityId: productId,
    entityType: "product",
    metadata: { note },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products?reviewed=${productId}`);
}

async function toggleSuspension(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const suspended = String(formData.get("suspended") ?? "") === "suspend";
  const note = String(formData.get("note") ?? "").trim();

  if (!productId || !note) {
    redirect("/admin/products?error=missing_note");
  }

  const service = createServiceClient();
  const { error } = await service
    .from("products")
    .update({ is_suspended: suspended })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: suspended ? "product.suspend" : "product.resume",
    actorId: admin.id,
    entityId: productId,
    entityType: "product",
    metadata: { note },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products?reviewed=${productId}`);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reviewed?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const service = createServiceClient();
  const { data: products } = await service
    .from("products")
    .select(
      "id, title, summary, category, price_cents, status, review_notes, is_suspended, seller_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>AI 应用市场审核</h1>
        <p className="auth-intro">审核开发者上架的 AI 应用，必须填写通过备注或拒绝原因。</p>
      </div>
      {query.error ? <p className="auth-message">请填写审核备注。</p> : null}
      {query.reviewed ? (
        <p className="auth-message">已处理产品：{query.reviewed}</p>
      ) : null}
      <div className="workspace-list">
        {products?.map((product) => (
          <Card className="settings-card" key={product.id}>
            <span className="status-badge">
              {statusLabel[product.status] ?? product.status}
              {product.is_suspended ? " · 已下架" : ""}
            </span>
            <h2>{product.title}</h2>
            <p>{product.summary}</p>
            <p>
              {productCategoryLabels[
                product.category as keyof typeof productCategoryLabels
              ] ?? product.category}{" "}
              · {currency.format(product.price_cents / 100)}
            </p>
            <p>卖家：{product.seller_id}</p>
            {product.review_notes ? (
              <p>审核备注：{product.review_notes}</p>
            ) : null}
            <form action={reviewProduct} className="auth-form">
              <input name="productId" type="hidden" value={product.id} />
              <label htmlFor={`product-note-${product.id}`}>审核备注</label>
              <textarea
                id={`product-note-${product.id}`}
                name="note"
                required
                rows={2}
              />
              <div className="button-row">
                <Button name="decision" type="submit" value="approve">
                  通过上架
                </Button>
                <Button
                  name="decision"
                  type="submit"
                  value="reject"
                  variant="secondary"
                >
                  拒绝
                </Button>
              </div>
            </form>
            <form action={toggleSuspension} className="auth-form">
              <input name="productId" type="hidden" value={product.id} />
              <input
                name="suspended"
                type="hidden"
                value={product.is_suspended ? "resume" : "suspend"}
              />
              <label htmlFor={`product-suspend-${product.id}`}>
                下架 / 恢复原因
              </label>
              <textarea
                id={`product-suspend-${product.id}`}
                name="note"
                required
                rows={2}
              />
              <Button type="submit" variant="secondary">
                {product.is_suspended ? "恢复上架" : "下架"}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </main>
  );
}
