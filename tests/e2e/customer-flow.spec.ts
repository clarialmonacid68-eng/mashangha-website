import { expect, test } from "@playwright/test";

import {
  createDemandDraft,
  publishDemand,
  submitDemandForReview,
} from "@/lib/domain/demands/service";
import { createQuote, selectQuoteForOrder } from "@/lib/domain/quotes/service";
import { confirmMockPayment, createOrderPayment } from "@/lib/payments/service";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import {
  approveDeveloper,
  createAdminClient,
  createSignedInUser,
} from "./marketplace-flow-helpers";

test("customer publishes demand, selects quote and completes mock payment", async () => {
  const admin = createAdminClient();
  const customer = await createSignedInUser(admin, "customer");
  const developer = await createSignedInUser(admin, "developer");
  await approveDeveloper(admin, developer.userId);

  const demand = await createDemandDraft(customer.client, {
    attachments: [],
    budgetMaxCents: 800_000,
    budgetMinCents: 300_000,
    cooperationMode: "fixed_scope",
    description: "希望在企业官网接入 AI 客服，支持产品问答、线索收集和人工联系方式展示。",
    expectedDeliveryDays: 21,
    projectType: "ai_app",
    title: "企业官网接入 AI 客服",
  });
  await submitDemandForReview(customer.client, demand.id);
  await publishDemand(admin, demand.id);

  const quote = await createQuote(developer.client, demand.id, {
    amountCents: 500_000,
    deliveryDays: 14,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    proposal: "我会完成客服组件、知识库接入、后台配置和上线部署，确保客户可以直接试用。",
  });
  const order = await selectQuoteForOrder(customer.client, quote.id);

  const provider = new MockPaymentProvider();
  const checkout = await createOrderPayment(customer.client, provider, {
    idempotencyKey: `pay-${order.id}`,
    orderId: order.id,
  });
  const confirmed = await confirmMockPayment(admin, provider, {
    providerPaymentId: checkout.providerPayment.providerPaymentId,
  });

  expect(confirmed.order.status).toBe("in_progress");
  expect(confirmed.payment.status).toBe("succeeded");
});
