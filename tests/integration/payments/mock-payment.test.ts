// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDemandDraft,
  publishDemand,
  submitDemandForReview,
} from "@/lib/domain/demands/service";
import { createQuote, selectQuoteForOrder } from "@/lib/domain/quotes/service";
import {
  closeOrderPayment,
  confirmOrderMockPaymentForUser,
  confirmMockPayment,
  createOrderPayment,
} from "@/lib/payments/service";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("mock full-payment checkout", () => {
  let admin: SupabaseClient;
  let customer: SupabaseClient;
  let developer: SupabaseClient;
  let developerId: string;
  const createdUserIds: string[] = [];

  async function createSignedInUser(label: string) {
    const email = `payment-${label}-${crypto.randomUUID()}@example.com`;
    const password = `Test-${crypto.randomUUID()}-Aa1!`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;
    createdUserIds.push(data.user.id);

    const client = createClient(supabaseUrl, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;
    return { client, userId: data.user.id };
  }

  async function approveDeveloper(userId: string) {
    const { error: profileError } = await admin
      .from("developer_profiles")
      .upsert({
        bio: "可承接 AI 应用和自动化工具开发。",
        headline: "模拟支付测试开发者",
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
        skills: ["AI 应用"],
        user_id: userId,
      });
    if (profileError) throw profileError;

    const { error: roleError } = await admin.from("user_roles").upsert({
      role: "developer",
      user_id: userId,
    });
    if (roleError) throw roleError;
  }

  async function createPendingPaymentOrder() {
    const demand = await createDemandDraft(customer, {
      attachments: [],
      budgetMaxCents: 800_000,
      budgetMinCents: 300_000,
      cooperationMode: "fixed_scope",
      description:
        "需要为企业官网接入 AI 客服，支持产品问答、线索收集和人工联系方式展示。",
      expectedDeliveryDays: 21,
      projectType: "ai_app",
      title: `模拟付款测试 ${crypto.randomUUID().slice(0, 8)}`,
    });
    await submitDemandForReview(customer, demand.id);
    await publishDemand(admin, demand.id);
    const quote = await createQuote(developer, demand.id, {
      amountCents: 500_000,
      deliveryDays: 14,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      proposal: "我会完成客服组件、知识库接入、后台配置和上线部署，确保客户可以直接试用。",
    });

    return selectQuoteForOrder(customer, quote.id);
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [customerAccount, developerAccount] = await Promise.all([
      createSignedInUser("customer"),
      createSignedInUser("developer"),
    ]);
    customer = customerAccount.client;
    developer = developerAccount.client;
    developerId = developerAccount.userId;
    await approveDeveloper(developerAccount.userId);
  });

  afterAll(async () => {
    await Promise.all(
      createdUserIds.map((userId) =>
        admin.from("demands").delete().eq("customer_id", userId),
      ),
    );
    await Promise.all(
      createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId)),
    );
  });

  it("creates one effective payment from the order amount", async () => {
    const provider = new MockPaymentProvider();
    const order = await createPendingPaymentOrder();
    const first = await createOrderPayment(customer, provider, {
      idempotencyKey: `pay-${order.id}`,
      orderId: order.id,
    });
    const second = await createOrderPayment(customer, provider, {
      idempotencyKey: `pay-${order.id}-different-key`,
      orderId: order.id,
    });

    expect(second.payment.id).toBe(first.payment.id);
    expect(first.payment.amount_cents).toBe(order.amount_cents);

    const { data: payments } = await admin
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .in("status", ["created", "pending"]);
    expect(payments).toHaveLength(1);
  });

  it("confirms payment transactionally and is safe to repeat", async () => {
    const provider = new MockPaymentProvider();
    const order = await createPendingPaymentOrder();
    const checkout = await createOrderPayment(customer, provider, {
      idempotencyKey: `pay-${order.id}`,
      orderId: order.id,
    });

    const first = await confirmMockPayment(admin, provider, {
      providerPaymentId: checkout.providerPayment.providerPaymentId,
    });
    const second = await confirmMockPayment(admin, provider, {
      providerPaymentId: checkout.providerPayment.providerPaymentId,
    });

    expect(second.payment.id).toBe(first.payment.id);
    expect(second.order.id).toBe(first.order.id);
    expect(second.order.status).toBe("in_progress");

    const { data: payments } = await admin
      .from("payments")
      .select("id, status")
      .eq("order_id", order.id)
      .eq("status", "succeeded");
    expect(payments).toHaveLength(1);

    const { data: notifications } = await admin
      .from("notifications")
      .select("event_key, event_type, recipient_id, title")
      .eq("recipient_id", developerId)
      .eq("event_key", `payment:${order.id}:succeeded`);
    expect(notifications).toEqual([
      {
        event_key: `payment:${order.id}:succeeded`,
        event_type: "payment_succeeded",
        recipient_id: developerId,
        title: "客户已完成模拟付款",
      },
    ]);
  });

  it("confirms a pay-page mock payment only for the order customer", async () => {
    const provider = new MockPaymentProvider();
    const order = await createPendingPaymentOrder();
    const checkout = await createOrderPayment(customer, provider, {
      idempotencyKey: `pay-${order.id}`,
      orderId: order.id,
    });

    await expect(
      confirmOrderMockPaymentForUser(developer, admin, {
        orderId: order.id,
        providerPaymentId: checkout.providerPayment.providerPaymentId,
      }),
    ).resolves.toEqual({ ok: false, reason: "forbidden" });

    const confirmed = await confirmOrderMockPaymentForUser(customer, admin, {
      orderId: order.id,
      providerPaymentId: checkout.providerPayment.providerPaymentId,
    });

    expect(confirmed).toEqual({ ok: true, orderId: order.id });

    const { data: storedOrder } = await admin
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(storedOrder?.status).toBe("in_progress");
  });

  it("closes a pending payment before closing the order", async () => {
    const provider = new MockPaymentProvider();
    const order = await createPendingPaymentOrder();
    const checkout = await createOrderPayment(customer, provider, {
      idempotencyKey: `pay-${order.id}`,
      orderId: order.id,
    });

    const closed = await closeOrderPayment(admin, provider, {
      providerPaymentId: checkout.providerPayment.providerPaymentId,
    });

    expect(closed.payment.status).toBe("closed");
    expect(closed.order.status).toBe("closed");
  });
});
