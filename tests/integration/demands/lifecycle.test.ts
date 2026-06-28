// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  closeDemand,
  createDemandDraft,
  listPublishedDemands,
  markDemandMatched,
  publishDemand,
  submitDemandForReview,
  updateDemandDraft,
  type DemandInput,
} from "@/lib/domain/demands/service";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("demand publishing lifecycle", () => {
  let admin: SupabaseClient;
  let customer: SupabaseClient;
  const createdUserIds: string[] = [];

  const validDemand: DemandInput = {
    title: "企业官网接入 AI 客服",
    projectType: "ai_app",
    description:
      "希望在企业官网右下角接入 AI 客服，支持产品问答、线索收集和人工联系方式展示。",
    budgetMinCents: 300_000,
    budgetMaxCents: 800_000,
    expectedDeliveryDays: 21,
    cooperationMode: "fixed_scope",
    attachments: [
      {
        fileName: "需求说明.pdf",
        storagePath: "demands/test/requirements.pdf",
        contentType: "application/pdf",
        sizeBytes: 120_000,
      },
    ],
  };

  async function createSignedInCustomer(label: string) {
    const email = `demand-${label}-${crypto.randomUUID()}@example.com`;
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

  beforeAll(async () => {
    admin = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const account = await createSignedInCustomer("customer");
    customer = account.client;
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

  it("validates demand budget before creating drafts", async () => {
    await expect(
      createDemandDraft(customer, {
        ...validDemand,
        budgetMinCents: 0,
      }),
    ).rejects.toThrow("预算必须大于 0");

    await expect(
      createDemandDraft(customer, {
        ...validDemand,
        budgetMinCents: 900_000,
        budgetMaxCents: 800_000,
      }),
    ).rejects.toThrow("预算下限不能高于预算上限");
  });

  it("moves a demand through draft, review, published, matched and closed states", async () => {
    const draft = await createDemandDraft(customer, validDemand);

    expect(draft.status).toBe("draft");
    expect(draft.project_type).toBe("ai_app");
    expect(draft.expected_delivery_days).toBe(21);

    const pending = await submitDemandForReview(customer, draft.id);
    expect(pending.status).toBe("pending_review");

    const published = await publishDemand(admin, draft.id);
    expect(published.status).toBe("published");
    expect(published.published_at).toBeTruthy();

    const matched = await markDemandMatched(admin, draft.id);
    expect(matched.status).toBe("matched");

    const closed = await closeDemand(customer, draft.id);
    expect(closed.status).toBe("closed");
  });

  it("keeps pending demands out of the public marketplace", async () => {
    const draft = await createDemandDraft(customer, {
      ...validDemand,
      title: "待审核的私有需求",
    });
    await submitDemandForReview(customer, draft.id);

    const publicClient = createClient(supabaseUrl, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const demands = await listPublishedDemands(publicClient, {
      keyword: "待审核的私有需求",
    });

    expect(demands).toEqual([]);
  });

  it("filters the public marketplace by type, budget, cycle, keyword and recency", async () => {
    const draft = await createDemandDraft(customer, {
      ...validDemand,
      title: "小程序订单系统开发",
      projectType: "mini_program",
      budgetMinCents: 120_000,
      budgetMaxCents: 300_000,
      expectedDeliveryDays: 14,
    });
    await submitDemandForReview(customer, draft.id);
    await publishDemand(admin, draft.id);

    const publicClient = createClient(supabaseUrl, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const demands = await listPublishedDemands(publicClient, {
      projectType: "mini_program",
      budgetMaxCents: 400_000,
      maxDeliveryDays: 20,
      keyword: "订单系统",
      publishedWithinDays: 7,
    });

    expect(demands.map((demand) => demand.id)).toContain(draft.id);
  });

  it("lets owners close published demands but blocks silent core edits after publish", async () => {
    const draft = await createDemandDraft(customer, {
      ...validDemand,
      title: "发布后不可改范围的需求",
    });
    await submitDemandForReview(customer, draft.id);
    await publishDemand(admin, draft.id);

    await expect(
      updateDemandDraft(customer, draft.id, {
        ...validDemand,
        title: "偷偷改掉核心范围",
      }),
    ).rejects.toThrow("只能修改草稿需求");

    const { data, error } = await customer
      .from("demands")
      .update({ title: "直接绕过服务改标题" })
      .eq("id", draft.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from("demands")
      .select("title")
      .eq("id", draft.id)
      .single();
    expect(unchanged?.title).toBe("发布后不可改范围的需求");

    const closed = await closeDemand(customer, draft.id);
    expect(closed.status).toBe("closed");
  });
});
