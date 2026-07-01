import { expect, test } from "@playwright/test";

import {
  confirmProductPurchase,
  createProductForReview,
  listBuyerPurchases,
  purchaseProduct,
} from "@/lib/domain/products/service";
import {
  approveDeveloper,
  createAdminClient,
  createSignedInUser,
} from "./marketplace-flow-helpers";

test("buyer purchases a published product and receives fulfillment payload", async () => {
  const admin = createAdminClient();
  const seller = await createSignedInUser(admin, "product-seller");
  const buyer = await createSignedInUser(admin, "product-buyer");
  await approveDeveloper(admin, seller.userId);

  const fulfillment = `license-${crypto.randomUUID()}`;
  const product = await createProductForReview(seller.client, {
    category: "ai_agent",
    description:
      "一个面向客服团队的 AI 智能体模板，包含知识库接入、对话引导和交付说明。",
    fulfillment,
    priceYuan: 199,
    summary: "客服 AI 智能体模板",
    title: `客服 AI 智能体 ${crypto.randomUUID().slice(0, 8)}`,
  });

  const { data: published, error: publishError } = await admin
    .from("products")
    .update({
      published_at: new Date().toISOString(),
      review_notes: "E2E approved",
      status: "published",
    })
    .eq("id", product.id)
    .select("id, status")
    .single();

  expect(publishError).toBeNull();
  expect(published?.status).toBe("published");

  const purchase = await purchaseProduct(buyer.client, product.id);

  expect(purchase.status).toBe("pending_payment");
  expect(purchase.amount_cents).toBe(19_900);
  expect(purchase.buyer_id).toBe(buyer.userId);
  expect(purchase.seller_id).toBe(seller.userId);

  const confirmed = await confirmProductPurchase(buyer.client, purchase.id);

  expect(confirmed.status).toBe("paid");
  expect(confirmed.delivered_payload).toBe(fulfillment);

  const purchases = await listBuyerPurchases(buyer.client, buyer.userId);
  const listedPurchase = purchases.find((item) => item.id === purchase.id);

  expect(listedPurchase).toMatchObject({
    delivered_payload: fulfillment,
    id: purchase.id,
    status: "paid",
  });
});
