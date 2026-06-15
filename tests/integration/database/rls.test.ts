// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeWithDatabase =
  anonKey && serviceRoleKey ? describe : describe.skip;

describeWithDatabase("marketplace row level security", () => {
  let admin: SupabaseClient;
  const createdUserIds: string[] = [];
  let customerA: SupabaseClient;
  let customerB: SupabaseClient;
  let customerBUserId: string;
  let customerAOrderId: string;

  async function createCustomer(label: string) {
    const email = `rls-${label}-${crypto.randomUUID()}@example.com`;
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

    const [a, b, developer] = await Promise.all([
      createCustomer("customer-a"),
      createCustomer("customer-b"),
      createCustomer("developer"),
    ]);

    customerA = a.client;
    customerB = b.client;
    customerBUserId = b.userId;

    const { data: demand, error: demandError } = await admin
      .from("demands")
      .insert({
        customer_id: a.userId,
        title: "Private RLS test demand",
        description: "This demand exists only to exercise order isolation.",
        budget_min_cents: 10_000,
        budget_max_cents: 20_000,
        status: "matched",
      })
      .select("id")
      .single();

    if (demandError) throw demandError;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        customer_id: a.userId,
        developer_id: developer.userId,
        demand_id: demand.id,
        amount_cents: 15_000,
        commission_bps: 1_000,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;
    customerAOrderId = order.id;
  });

  afterAll(async () => {
    if (customerAOrderId) {
      await admin.from("orders").delete().eq("id", customerAOrderId);
    }
    await Promise.all(
      createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId)),
    );
  });

  it("allows a customer to read their own private order", async () => {
    const { data, error } = await customerA
      .from("orders")
      .select("id")
      .eq("id", customerAOrderId);

    expect(error).toBeNull();
    expect(data).toEqual([{ id: customerAOrderId }]);
  });

  it("prevents a customer from reading another customer's private order", async () => {
    const { data, error } = await customerB
      .from("orders")
      .select("*")
      .eq("id", customerAOrderId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("prevents users from self-approving a developer profile", async () => {
    const { error } = await customerB.from("developer_profiles").insert({
      user_id: customerBUserId,
      headline: "Unreviewed developer",
      review_status: "approved",
    });

    expect(error).not.toBeNull();
  });

  it("lets a customer apply for a draft developer role", async () => {
    const { error } = await customerB.rpc("apply_for_developer");
    expect(error).toBeNull();

    const [{ data: roles }, { data: profile }] = await Promise.all([
      customerB.from("user_roles").select("role"),
      customerB
        .from("developer_profiles")
        .select("review_status")
        .eq("user_id", customerBUserId)
        .single(),
    ]);

    expect(roles?.map(({ role }) => role)).toContain("developer");
    expect(profile?.review_status).toBe("draft");
  });
});
