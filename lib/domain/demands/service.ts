import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseDemandFilters,
  parseDemandInput,
  type DemandFilters,
  type DemandInput,
} from "@/lib/domain/demands/schema";

export type { DemandFilters, DemandInput };

async function getCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("请先登录后再操作需求");
  }

  return user.id;
}

function demandPayload(input: ReturnType<typeof parseDemandInput>) {
  return {
    title: input.title,
    description: input.description,
    project_type: input.projectType,
    budget_min_cents: input.budgetMinCents,
    budget_max_cents: input.budgetMaxCents,
    expected_delivery_days: input.expectedDeliveryDays,
    cooperation_mode: input.cooperationMode,
  };
}

export async function createDemandDraft(
  supabase: SupabaseClient,
  input: DemandInput,
) {
  const demand = parseDemandInput(input);
  const userId = await getCurrentUserId(supabase);
  const { data, error } = await supabase
    .from("demands")
    .insert({
      ...demandPayload(demand),
      customer_id: userId,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (demand.attachments.length) {
    const { error: attachmentError } = await supabase
      .from("demand_attachments")
      .insert(
        demand.attachments.map((attachment) => ({
          demand_id: data.id,
          owner_id: userId,
          storage_path: attachment.storagePath,
          file_name: attachment.fileName,
          content_type: attachment.contentType ?? null,
          size_bytes: attachment.sizeBytes,
        })),
      );

    if (attachmentError) {
      throw new Error(attachmentError.message);
    }
  }

  return data;
}

export async function updateDemandDraft(
  supabase: SupabaseClient,
  demandId: string,
  input: DemandInput,
) {
  const demand = parseDemandInput(input);
  const { data: existing, error: existingError } = await supabase
    .from("demands")
    .select("status")
    .eq("id", demandId)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing.status !== "draft") {
    throw new Error("只能修改草稿需求");
  }

  const { data, error } = await supabase
    .from("demands")
    .update(demandPayload(demand))
    .eq("id", demandId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function submitDemandForReview(
  supabase: SupabaseClient,
  demandId: string,
) {
  const { data, error } = await supabase
    .from("demands")
    .update({ status: "pending_review" })
    .eq("id", demandId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function publishDemand(supabase: SupabaseClient, demandId: string) {
  const { data, error } = await supabase
    .from("demands")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", demandId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function markDemandMatched(
  supabase: SupabaseClient,
  demandId: string,
) {
  const { data, error } = await supabase
    .from("demands")
    .update({ status: "matched", matched_at: new Date().toISOString() })
    .eq("id", demandId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function closeDemand(supabase: SupabaseClient, demandId: string) {
  const { data, error } = await supabase.rpc("close_demand", {
    demand_id: demandId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listCustomerDemands(
  supabase: SupabaseClient,
  customerId: string,
) {
  const { data, error } = await supabase
    .from("demands")
    .select("id, title, description, status, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getCustomerDemandQuoteContext(
  supabase: SupabaseClient,
  demandId: string,
) {
  const { data, error } = await supabase
    .from("demands")
    .select("id, title, status")
    .eq("id", demandId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listPublishedDemands(
  supabase: SupabaseClient,
  input: DemandFilters = {},
) {
  const filters = parseDemandFilters(input);
  let query = supabase
    .from("demands")
    .select(
      "id, title, description, project_type, cooperation_mode, budget_min_cents, budget_max_cents, expected_delivery_days, published_at",
    )
    .eq("status", "published")
    .eq("is_suspended", false)
    .order("published_at", { ascending: false })
    .limit(24);

  if (filters.projectType) {
    query = query.eq("project_type", filters.projectType);
  }

  if (filters.budgetMaxCents) {
    query = query.lte("budget_min_cents", filters.budgetMaxCents);
  }

  if (filters.maxDeliveryDays) {
    query = query.lte("expected_delivery_days", filters.maxDeliveryDays);
  }

  if (filters.keyword) {
    query = query.or(
      `title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`,
    );
  }

  if (filters.publishedWithinDays) {
    const since = new Date();
    since.setDate(since.getDate() - filters.publishedWithinDays);
    query = query.gte("published_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Read a single demand for the public marketing detail page. Owns the public
 * visibility rule: only published, non-suspended demands are returned. Returns
 * null when the demand does not exist or is not publicly visible, so the page
 * can render notFound().
 */
export async function getPublishedDemandDetail(
  supabase: SupabaseClient,
  demandId: string,
) {
  const { data, error } = await supabase
    .from("demands")
    .select(
      "title, description, project_type, cooperation_mode, budget_min_cents, budget_max_cents, expected_delivery_days, published_at",
    )
    .eq("id", demandId)
    .eq("status", "published")
    .eq("is_suspended", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
