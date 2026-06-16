// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createOrderFileUploadRequest,
  createOrderMessage,
  submitOrderDelivery,
} from "@/lib/domain/orders/service";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("order collaboration and delivery", () => {
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
    const email = `order-${label}-${crypto.randomUUID()}@example.com`;
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

  async function createOrder(status: "pending_payment" | "in_progress") {
    const { data: demand, error: demandError } = await admin
      .from("demands")
      .insert({
        budget_max_cents: 900_000,
        budget_min_cents: 500_000,
        cooperation_mode: "fixed_scope",
        customer_id: customerId,
        description: "订单协作测试需求，需要交付代码、文档和部署说明。",
        expected_delivery_days: 14,
        project_type: "ai_app",
        status: "matched",
        title: `协作测试 ${crypto.randomUUID().slice(0, 8)}`,
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
        customer_id: customerId,
        demand_id: demand.id,
        developer_id: developerId,
        paid_at: status === "in_progress" ? new Date().toISOString() : null,
        status,
      })
      .select()
      .single();

    if (orderError) throw orderError;
    createdOrderIds.push(order.id);
    return order;
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

  it("lets order participants post immutable messages with private attachments", async () => {
    const order = await createOrder("in_progress");

    await expect(
      createOrderFileUploadRequest(stranger, {
        contentType: "application/pdf",
        fileName: "scope.pdf",
        orderId: order.id,
        sizeBytes: 1024,
      }),
    ).rejects.toThrow("无权访问该订单");

    const upload = await createOrderFileUploadRequest(customer, {
      contentType: "application/pdf",
      fileName: "scope.pdf",
      orderId: order.id,
      sizeBytes: 1024,
    });
    expect(upload.storagePath).toMatch(
      new RegExp(`^orders/${order.id}/[0-9a-f-]+-scope\\.pdf$`),
    );

    const message = await createOrderMessage(customer, order.id, {
      attachments: [
        {
          contentType: "application/pdf",
          fileName: "scope.pdf",
          sizeBytes: 1024,
          storagePath: upload.storagePath,
        },
      ],
      body: "这是需求补充说明，请按附件范围交付。",
    });

    expect(message.body).toBe("这是需求补充说明，请按附件范围交付。");

    const { data: developerMessages } = await developer
      .from("order_messages")
      .select("id, body")
      .eq("order_id", order.id);
    expect(developerMessages).toHaveLength(1);

    const { data: strangerMessages } = await stranger
      .from("order_messages")
      .select("id")
      .eq("order_id", order.id);
    expect(strangerMessages).toHaveLength(0);
  });

  it("allows only the assigned developer to deliver an in-progress order", async () => {
    const pendingOrder = await createOrder("pending_payment");
    await expect(
      submitOrderDelivery(developer, pendingOrder.id, {
        deliveryUrl: "https://example.com/pending",
        notes: "这份交付不应被允许，因为订单还未付款。",
      }),
    ).rejects.toThrow("订单当前不可交付");

    const order = await createOrder("in_progress");
    await expect(
      submitOrderDelivery(customer, order.id, {
        deliveryUrl: "https://example.com/customer",
        notes: "客户不能替开发者提交交付。",
      }),
    ).rejects.toThrow("只有接单开发者可以交付");

    const first = await submitOrderDelivery(developer, order.id, {
      attachments: [
        {
          contentType: "application/zip",
          fileName: "release-v1.zip",
          sizeBytes: 4096,
          storagePath: `orders/${order.id}/release-v1.zip`,
        },
      ],
      notes: "首版交付，包含源码和部署文档。",
    });
    expect(first.version).toBe(1);

    await admin
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", order.id);

    const second = await submitOrderDelivery(developer, order.id, {
      deliveryUrl: "https://example.com/release-v2",
      notes: "第二版交付，修复了客户提出的问题。",
    });
    expect(second.version).toBe(2);

    const { data: deliveries } = await admin
      .from("deliveries")
      .select("version, is_current")
      .eq("order_id", order.id)
      .order("version");
    expect(deliveries).toEqual([
      { is_current: false, version: 1 },
      { is_current: true, version: 2 },
    ]);

    const { data: deliveredOrder } = await admin
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(deliveredOrder?.status).toBe("delivered");
  });
});
