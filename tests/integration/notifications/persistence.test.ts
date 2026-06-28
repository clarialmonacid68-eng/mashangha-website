// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  openOrderDispute,
  resolveDisputeAsFullRefund,
} from "@/lib/domain/disputes/service";
import {
  acceptOrderDelivery,
  completeAcceptedOrderWithMockSettlement,
  createOrderMessage,
  submitOrderDelivery,
} from "@/lib/domain/orders/service";
import { SupabaseNotificationRepository } from "@/lib/notifications/repository";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("persistent marketplace notifications", () => {
  let admin: SupabaseClient;
  let customer: { client: SupabaseClient; userId: string };
  let developer: { client: SupabaseClient; userId: string };
  const createdDemandIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdUserIds: string[] = [];

  async function createSignedInUser(label: string) {
    const email = `notification-${label}-${crypto.randomUUID()}@example.com`;
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

  async function createOrder() {
    const { data: demand, error: demandError } = await admin
      .from("demands")
      .insert({
        budget_max_cents: 800_000,
        budget_min_cents: 300_000,
        cooperation_mode: "fixed_scope",
        customer_id: customer.userId,
        description: "通知测试需求，覆盖订单参与双方在关键协作动作后的站内消息写入。",
        expected_delivery_days: 14,
        project_type: "ai_app",
        status: "matched",
        title: `通知测试 ${crypto.randomUUID().slice(0, 8)}`,
      })
      .select("id")
      .single();

    if (demandError) throw demandError;
    createdDemandIds.push(demand.id);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        amount_cents: 500_000,
        commission_bps: 1_000,
        customer_id: customer.userId,
        demand_id: demand.id,
        developer_id: developer.userId,
        paid_at: new Date().toISOString(),
        status: "in_progress",
      })
      .select()
      .single();

    if (orderError) throw orderError;
    createdOrderIds.push(order.id);
    return order;
  }

  async function createSucceededPayment(orderId: string) {
    const { error } = await admin.from("payments").insert({
      amount_cents: 500_000,
      idempotency_key: `notification-payment-${orderId}`,
      order_id: orderId,
      platform_payment_no: `notification-pay-${crypto.randomUUID()}`,
      provider: "mock",
      provider_transaction_id: `notification-tx-${crypto.randomUUID()}`,
      raw_status: { status: "succeeded" },
      status: "succeeded",
    });

    if (error) throw error;
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    customer = await createSignedInUser("customer");
    developer = await createSignedInUser("developer");
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

  it("deduplicates persisted in-app notifications by event and recipient", async () => {
    const repository = new SupabaseNotificationRepository(admin);
    const event = {
      actorId: customer.userId,
      eventKey: `notification:test:${crypto.randomUUID()}`,
      recipientId: developer.userId,
      title: "测试通知",
      type: "message_created" as const,
    };

    const first = await repository.createInApp(event);
    const second = await repository.createInApp(event);

    expect(second.id).toBe(first.id);
    const { data } = await admin
      .from("notifications")
      .select("id")
      .eq("recipient_id", developer.userId)
      .eq("event_key", event.eventKey);
    expect(data).toHaveLength(1);
  });

  it("persists an in-app notification for the other order participant after a message", async () => {
    const order = await createOrder();
    const message = await createOrderMessage(customer.client, order.id, {
      body: "我补充了一个需求说明。",
    });

    const { data: notifications } = await admin
      .from("notifications")
      .select("actor_id, event_key, event_type, recipient_id, title")
      .eq("recipient_id", developer.userId)
      .eq("event_key", `message:${message.id}`);

    expect(notifications).toEqual([
      {
        actor_id: customer.userId,
        event_key: `message:${message.id}`,
        event_type: "message_created",
        recipient_id: developer.userId,
        title: "订单有新留言",
      },
    ]);
  });

  it("persists delivery, acceptance and mock settlement notifications", async () => {
    const order = await createOrder();
    await createSucceededPayment(order.id);

    const delivery = await submitOrderDelivery(developer.client, order.id, {
      deliveryUrl: "https://example.com/release",
      notes: "正式交付，包含源码和部署说明。",
    });
    await acceptOrderDelivery(customer.client, order.id);
    await completeAcceptedOrderWithMockSettlement(admin, order.id);

    const { data: notifications } = await admin
      .from("notifications")
      .select("event_key, event_type, recipient_id, title")
      .in("event_key", [
        `delivery:${delivery.id}:submitted`,
        `delivery:${order.id}:accepted`,
        `settlement:${order.id}:completed`,
      ])
      .order("event_key", { ascending: true });

    expect(notifications).toEqual(
      expect.arrayContaining([
        {
          event_key: `delivery:${delivery.id}:submitted`,
          event_type: "delivery_submitted",
          recipient_id: customer.userId,
          title: "订单已提交正式交付",
        },
        {
          event_key: `delivery:${order.id}:accepted`,
          event_type: "delivery_accepted",
          recipient_id: developer.userId,
          title: "客户已验收交付",
        },
        {
          event_key: `settlement:${order.id}:completed`,
          event_type: "profit_share_updated",
          recipient_id: developer.userId,
          title: "模拟结算已完成",
        },
      ]),
    );
  });

  it("persists dispute refund resolution notifications for both participants", async () => {
    const order = await createOrder();
    const dispute = await openOrderDispute(customer.client, order.id, {
      reason: "交付方向存在明显偏差，要求平台介入并裁决退款。",
      requestedResolution: "refund",
    });

    await resolveDisputeAsFullRefund(admin, dispute.id, {
      adminId: customer.userId,
      notes: "证据支持全额退款裁决。",
    });

    const { data: notifications } = await admin
      .from("notifications")
      .select("event_key, event_type, recipient_id, title")
      .eq("event_key", `dispute:${dispute.id}:resolved_refund`)
      .order("recipient_id", { ascending: true });

    expect(notifications).toEqual(
      expect.arrayContaining([
        {
          event_key: `dispute:${dispute.id}:resolved_refund`,
          event_type: "refund_updated",
          recipient_id: customer.userId,
          title: "争议已裁决全额退款",
        },
        {
          event_key: `dispute:${dispute.id}:resolved_refund`,
          event_type: "refund_updated",
          recipient_id: developer.userId,
          title: "争议已裁决全额退款",
        },
      ]),
    );
  });
});
