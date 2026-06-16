// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createQuote,
  selectQuoteForOrder,
} from "@/lib/domain/quotes/service";
import {
  createDemandDraft,
  publishDemand,
  submitDemandForReview,
} from "@/lib/domain/demands/service";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("quote selection", () => {
  let admin: SupabaseClient;
  let customer: SupabaseClient;
  let developerA: SupabaseClient;
  let developerB: SupabaseClient;
  let customerUserId: string;
  let developerAUserId: string;
  let developerBUserId: string;
  const createdUserIds: string[] = [];

  async function createSignedInUser(label: string) {
    const email = `quote-${label}-${crypto.randomUUID()}@example.com`;
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

  async function approveDeveloper(userId: string, headline: string) {
    const { error: profileError } = await admin
      .from("developer_profiles")
      .upsert({
        user_id: userId,
        headline,
        bio: "可承接 AI 应用、小程序和自动化工具开发。",
        skills: ["AI 应用"],
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
      });
    if (profileError) throw profileError;

    const { error: roleError } = await admin.from("user_roles").upsert({
      user_id: userId,
      role: "developer",
    });
    if (roleError) throw roleError;
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [customerAccount, devAAccount, devBAccount] = await Promise.all([
      createSignedInUser("customer"),
      createSignedInUser("developer-a"),
      createSignedInUser("developer-b"),
    ]);

    customer = customerAccount.client;
    developerA = devAAccount.client;
    developerB = devBAccount.client;
    customerUserId = customerAccount.userId;
    developerAUserId = devAAccount.userId;
    developerBUserId = devBAccount.userId;

    await Promise.all([
      approveDeveloper(developerAUserId, "开发者 A"),
      approveDeveloper(developerBUserId, "开发者 B"),
    ]);
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

  async function createPublishedDemand() {
    const draft = await createDemandDraft(customer, {
      attachments: [],
      budgetMaxCents: 800_000,
      budgetMinCents: 300_000,
      cooperationMode: "fixed_scope",
      description:
        "需要为企业官网接入 AI 客服，支持产品问答、线索收集和人工联系方式展示。",
      expectedDeliveryDays: 21,
      projectType: "ai_app",
      title: `并发选标测试 ${crypto.randomUUID().slice(0, 8)}`,
    });
    await submitDemandForReview(customer, draft.id);
    return publishDemand(admin, draft.id);
  }

  it("allows only approved developers to quote once per demand", async () => {
    const demand = await createPublishedDemand();
    const quote = await createQuote(developerA, demand.id, {
      amountCents: 500_000,
      deliveryDays: 14,
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      proposal: "我会先整理需求，再完成客服组件、知识库接入和上线部署。",
    });

    expect(quote.status).toBe("active");

    await expect(
      createQuote(developerA, demand.id, {
        amountCents: 520_000,
        deliveryDays: 12,
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        proposal: "重复提交同一需求的有效报价应该被拦截。",
      }),
    ).rejects.toThrow();
  });

  it("selects one quote transactionally under concurrent requests", async () => {
    const demand = await createPublishedDemand();
    const [quoteA, quoteB] = await Promise.all([
      createQuote(developerA, demand.id, {
        amountCents: 500_000,
        deliveryDays: 14,
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        proposal: "方案 A：完成客服组件、知识库接入和上线部署。",
      }),
      createQuote(developerB, demand.id, {
        amountCents: 560_000,
        deliveryDays: 18,
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        proposal: "方案 B：完成客服组件、后台配置和上线部署。",
      }),
    ]);

    const attempts = await Promise.allSettled([
      selectQuoteForOrder(customer, quoteA.id),
      selectQuoteForOrder(customer, quoteB.id),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);

    const { data: orders, error: orderError } = await admin
      .from("orders")
      .select("id, demand_id, quote_id, customer_id, developer_id, amount_cents, commission_bps, status")
      .eq("demand_id", demand.id);

    expect(orderError).toBeNull();
    expect(orders).toHaveLength(1);
    expect(orders?.[0]?.customer_id).toBe(customerUserId);
    expect(orders?.[0]?.status).toBe("pending_payment");

    const { data: quotes, error: quotesError } = await admin
      .from("quotes")
      .select("id, status")
      .eq("demand_id", demand.id)
      .order("id");

    expect(quotesError).toBeNull();
    expect(quotes?.map((quote) => quote.status).sort()).toEqual([
      "rejected",
      "selected",
    ]);

    const { data: matchedDemand } = await admin
      .from("demands")
      .select("status")
      .eq("id", demand.id)
      .single();
    expect(matchedDemand?.status).toBe("matched");
  });
});
