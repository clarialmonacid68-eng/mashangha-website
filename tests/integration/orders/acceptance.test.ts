// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  acceptOrderDelivery,
  completeAcceptedOrderWithMockSettlement,
  createOrderReview,
  rejectOrderDelivery,
} from "@/lib/domain/orders/service";
import { openOrderDispute } from "@/lib/domain/disputes/service";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("order acceptance, disputes and reviews", () => {
  let admin: SupabaseClient;
  let customer: SupabaseClient;
  let developer: SupabaseClient;
  let stranger: SupabaseClient;
  let customerId: string;
  let developerId: string;
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdDemandIds: string[] = [];

  async function createSignedInUser(label: string) {
    const email = `acceptance-${label}-${crypto.randomUUID()}@example.com`;
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

  async function createOrder(
    status: "delivered" | "in_progress" | "completed" = "delivered",
  ) {
    const { data: demand, error: demandError } = await admin
      .from("demands")
      .insert({
        budget_max_cents: 900_000,
        budget_min_cents: 500_000,
        cooperation_mode: "fixed_scope",
        customer_id: customerId,
        description: "验收测试需求，覆盖验收、拒收、仲裁和评价。",
        expected_delivery_days: 14,
        project_type: "ai_app",
        status: "matched",
        title: `验收测试 ${crypto.randomUUID().slice(0, 8)}`,
      })
      .select("id")
      .single();

    if (demandError) throw demandError;
    createdDemandIds.push(demand.id);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        amount_cents: 600_000,
        commission_bps: 1_000,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        customer_id: customerId,
        demand_id: demand.id,
        developer_id: developerId,
        paid_at: new Date().toISOString(),
        status,
      })
      .select()
      .single();

    if (orderError) throw orderError;
    createdOrderIds.push(order.id);
    return order;
  }

  async function createSucceededPayment(orderId: string) {
    const { data: payment, error } = await admin
      .from("payments")
      .insert({
        amount_cents: 600_000,
        idempotency_key: `settlement-${orderId}`,
        order_id: orderId,
        platform_payment_no: `mock-pay-${crypto.randomUUID()}`,
        provider: "mock",
        provider_transaction_id: `mock-tx-${crypto.randomUUID()}`,
        raw_status: { status: "succeeded" },
        status: "succeeded",
      })
      .select()
      .single();

    if (error) throw error;
    return payment;
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [customerAccount, developerAccount, strangerAccount] =
      await Promise.all([
        createSignedInUser("customer"),
        createSignedInUser("developer"),
        createSignedInUser("stranger"),
      ]);

    customer = customerAccount.client;
    developer = developerAccount.client;
    stranger = strangerAccount.client;
    customerId = customerAccount.userId;
    developerId = developerAccount.userId;
  });

  afterAll(async () => {
    await Promise.all(
      createdOrderIds.map((orderId) =>
        admin.from("orders").delete().eq("id", orderId),
      ),
    );
    await Promise.all(
      createdDemandIds.map((demandId) =>
        admin.from("demands").delete().eq("id", demandId),
      ),
    );
    await Promise.all(
      createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId)),
    );
  });

  it("lets only the customer accept a delivered order", async () => {
    const order = await createOrder("delivered");

    await expect(acceptOrderDelivery(developer, order.id)).rejects.toThrow(
      "只有订单客户可以验收",
    );

    const accepted = await acceptOrderDelivery(customer, order.id);
    expect(accepted.status).toBe("accepted");
    expect(accepted.accepted_at).toEqual(expect.any(String));
  });

  it("requires a rejection reason and returns the order to in progress", async () => {
    const order = await createOrder("delivered");

    await expect(rejectOrderDelivery(customer, order.id, "")).rejects.toThrow(
      "拒绝验收必须提交理由",
    );

    const rejected = await rejectOrderDelivery(
      customer,
      order.id,
      "交付缺少部署说明，请补充后重新提交。",
    );
    expect(rejected.status).toBe("in_progress");

    const { data: history } = await admin
      .from("order_status_history")
      .select("from_status, to_status, reason")
      .eq("order_id", order.id)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    expect(history).toMatchObject({
      from_status: "delivered",
      reason: "交付缺少部署说明，请补充后重新提交。",
      to_status: "in_progress",
    });
  });

  it("opens disputes only for order participants", async () => {
    const order = await createOrder("delivered");

    await expect(
      openOrderDispute(stranger, order.id, {
        reason: "我不是参与者，不能开启争议。",
        requestedResolution: "continue",
      }),
    ).rejects.toThrow("无权访问该订单");

    const dispute = await openOrderDispute(customer, order.id, {
      reason: "开发者交付内容和报价方案不一致。",
      requestedResolution: "refund",
    });
    expect(dispute.status).toBe("open");

    const { data: disputedOrder } = await admin
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(disputedOrder?.status).toBe("disputed");
  });

  it("allows each party to review a completed order once", async () => {
    const order = await createOrder("completed");

    await expect(
      createOrderReview(customer, order.id, {
        body: "提前完成，沟通清楚。",
        isPublic: true,
        rating: 5,
      }),
    ).resolves.toMatchObject({
      author_id: customerId,
      rating: 5,
      subject_id: developerId,
    });

    await expect(
      createOrderReview(customer, order.id, {
        body: "不能重复评价。",
        isPublic: true,
        rating: 4,
      }),
    ).rejects.toThrow("每个订单只能评价一次");

    await expect(
      createOrderReview(developer, order.id, {
        body: "客户配合度高，需求边界清晰。",
        isPublic: true,
        rating: 5,
      }),
    ).resolves.toMatchObject({
      author_id: developerId,
      rating: 5,
      subject_id: customerId,
    });
  });

  it("completes an accepted order through mock settlement before review", async () => {
    const order = await createOrder("delivered");
    await createSucceededPayment(order.id);
    await acceptOrderDelivery(customer, order.id);

    const completed = await completeAcceptedOrderWithMockSettlement(admin, order.id);
    expect(completed.status).toBe("completed");
    expect(completed.completed_at).toEqual(expect.any(String));

    const { data: share } = await admin
      .from("profit_shares")
      .select("commission_amount_cents, developer_amount_cents, status")
      .eq("order_id", order.id)
      .single();
    expect(share).toMatchObject({
      commission_amount_cents: 60_000,
      developer_amount_cents: 540_000,
      status: "succeeded",
    });

    await expect(
      createOrderReview(customer, order.id, {
        body: "验收结算完成后可以评价。",
        isPublic: true,
        rating: 5,
      }),
    ).resolves.toMatchObject({
      author_id: customerId,
      subject_id: developerId,
    });
  });
});
