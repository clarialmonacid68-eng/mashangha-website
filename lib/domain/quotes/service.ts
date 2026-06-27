import type { SupabaseClient } from "@supabase/supabase-js";

export type QuoteInput = {
  amountCents: number;
  deliveryDays: number;
  expiresAt: string;
  proposal: string;
};

type DemandTitleJoin = { title: string | null } | { title: string | null }[] | null;

function normalizeDemandTitleJoin<T extends { demands: DemandTitleJoin }>(
  rows: T[] | null,
) {
  return (
    rows?.map((row) => ({
      ...row,
      demands: Array.isArray(row.demands)
        ? (row.demands[0] ?? null)
        : row.demands,
    })) ?? []
  );
}

function validateQuoteInput(input: QuoteInput) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("报价金额必须大于 0");
  }

  if (!Number.isInteger(input.deliveryDays) || input.deliveryDays <= 0) {
    throw new Error("工期必须大于 0");
  }

  if (input.proposal.trim().length < 20) {
    throw new Error("方案说明至少 20 个字符");
  }

  if (Number.isNaN(new Date(input.expiresAt).getTime())) {
    throw new Error("有效期格式不正确");
  }
}

async function getCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("请先登录后再操作报价");
  }

  return user.id;
}

export async function createQuote(
  supabase: SupabaseClient,
  demandId: string,
  input: QuoteInput,
) {
  validateQuoteInput(input);
  const developerId = await getCurrentUserId(supabase);
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      amount_cents: input.amountCents,
      delivery_days: input.deliveryDays,
      demand_id: demandId,
      developer_id: developerId,
      expires_at: input.expiresAt,
      proposal: input.proposal.trim(),
      status: "active",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function selectQuoteForOrder(
  supabase: SupabaseClient,
  quoteId: string,
) {
  const { data, error } = await supabase.rpc("select_quote_for_order", {
    quote_id: quoteId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listQuotesForCustomerDemand(
  supabase: SupabaseClient,
  demandId: string,
) {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, amount_cents, delivery_days, proposal, status, developer_id")
    .eq("demand_id", demandId)
    .order("amount_cents", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listDeveloperQuotes(
  supabase: SupabaseClient,
  developerId: string,
) {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, amount_cents, delivery_days, proposal, status, expires_at, demands(title)",
    )
    .eq("developer_id", developerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeDemandTitleJoin(data);
}
