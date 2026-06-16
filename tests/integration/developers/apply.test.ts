// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  submitDeveloperApplication,
  type DeveloperApplicationInput,
} from "@/lib/domain/developers/service";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("developer application workflow", () => {
  let admin: SupabaseClient;
  let applicant: SupabaseClient;
  let applicantUserId: string;
  const createdUserIds: string[] = [];

  const validApplication: DeveloperApplicationInput = {
    displayName: "码上好工作室",
    city: "上海",
    bio: "专注中小企业 AI 应用、小程序和自动化工具开发，能从需求梳理推进到交付上线。",
    skills: ["AI 应用", "Next.js"],
    serviceScopes: ["需求梳理", "原型开发", "上线部署"],
    startingPriceCents: 500_000,
    portfolio: {
      title: "智能客服插件",
      description: "为企业官网接入知识库问答、线索收集和人工联系方式展示。",
      url: "https://example.com/case/ai-support",
      imageUrl: "https://example.com/case/ai-support.png",
    },
    contact: "wechat: mahcod",
    payoutSubjectType: "individual",
    payoutSubjectName: "张三",
  };

  async function createSignedInCustomer(label: string) {
    const email = `developer-apply-${label}-${crypto.randomUUID()}@example.com`;
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

    const applicantAccount = await createSignedInCustomer("applicant");
    applicant = applicantAccount.client;
    applicantUserId = applicantAccount.userId;
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

  it("rejects missing required profile details", async () => {
    await expect(
      submitDeveloperApplication(applicant, {
        ...validApplication,
        displayName: "",
      }),
    ).rejects.toThrow("请填写姓名或品牌名");
  });

  it("requires at least one skill", async () => {
    await expect(
      submitDeveloperApplication(applicant, {
        ...validApplication,
        skills: [],
      }),
    ).rejects.toThrow("请至少填写一项技能");
  });

  it("validates portfolio URLs", async () => {
    await expect(
      submitDeveloperApplication(applicant, {
        ...validApplication,
        portfolio: {
          ...validApplication.portfolio,
          url: "not-a-url",
        },
      }),
    ).rejects.toThrow("作品链接格式不正确");
  });

  it("submits pending profiles without making them public", async () => {
    const profile = await submitDeveloperApplication(applicant, validApplication);

    expect(profile.review_status).toBe("pending");
    expect(profile.display_name).toBe(validApplication.displayName);
    expect(profile.skills).toEqual(validApplication.skills);

    const publicClient = createClient(supabaseUrl, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await publicClient
      .from("developer_profiles")
      .select("user_id")
      .eq("user_id", applicantUserId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("updates the existing draft or pending profile on repeat submit", async () => {
    const updated = await submitDeveloperApplication(applicant, {
      ...validApplication,
      displayName: "码上好 AI 应用工作室",
      skills: ["AI 应用", "小程序"],
    });

    expect(updated.review_status).toBe("pending");
    expect(updated.display_name).toBe("码上好 AI 应用工作室");
    expect(updated.skills).toEqual(["AI 应用", "小程序"]);

    const { data, error } = await admin
      .from("developer_profiles")
      .select("user_id")
      .eq("user_id", applicantUserId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
