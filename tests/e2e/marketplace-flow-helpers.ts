import { expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
export const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createSignedInUser(
  admin: SupabaseClient,
  label: string,
) {
  const email = `flow-${label}-${crypto.randomUUID()}@example.com`;
  const password = `Test-${crypto.randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  expect(signInError).toBeNull();

  return { client, email, password, userId: data.user!.id };
}

export async function approveDeveloper(
  admin: SupabaseClient,
  userId: string,
) {
  const { error: profileError } = await admin
    .from("developer_profiles")
    .upsert({
      bio: "可承接 AI 应用、企业自动化和网站开发。",
      headline: "端到端测试开发者",
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
      skills: ["AI 应用"],
      user_id: userId,
    });
  expect(profileError).toBeNull();

  const { error: roleError } = await admin.from("user_roles").upsert({
    role: "developer",
    user_id: userId,
  });
  expect(roleError).toBeNull();
}

export async function createDirectOrder(
  admin: SupabaseClient,
  input: {
    customerId: string;
    developerId: string;
    status: "delivered" | "in_progress";
  },
) {
  const { data: demand, error: demandError } = await admin
    .from("demands")
    .insert({
      budget_max_cents: 900_000,
      budget_min_cents: 500_000,
      cooperation_mode: "fixed_scope",
      customer_id: input.customerId,
      description: "端到端流程测试需求，覆盖订单履约和争议处理。",
      expected_delivery_days: 14,
      project_type: "ai_app",
      status: "matched",
      title: `流程测试 ${crypto.randomUUID().slice(0, 8)}`,
    })
    .select("id")
    .single();
  expect(demandError).toBeNull();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      amount_cents: 600_000,
      commission_bps: 1_000,
      customer_id: input.customerId,
      demand_id: demand!.id,
      developer_id: input.developerId,
      paid_at: new Date().toISOString(),
      status: input.status,
    })
    .select()
    .single();
  expect(orderError).toBeNull();
  return order!;
}
