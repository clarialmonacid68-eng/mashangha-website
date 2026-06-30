import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { logBusinessEvent } from "@/lib/observability/logger";
import { parseProductInput, type ProductInput } from "@/lib/domain/products/schema";

type Service = SupabaseClient<Database>;

const PUBLIC_COLUMNS =
  "id, seller_id, title, summary, description, category, price_cents, delivery_type, published_at";

async function getCurrentUserId(supabase: Service) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("请先登录后再操作产品");
  }

  return user.id;
}

function sanitizeSearchKeyword(keyword: string) {
  return keyword
    .replace(/[%,().{}[\]"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ProductFilters = {
  category?: string;
  keyword?: string;
};

export async function listPublishedProducts(
  supabase: Service,
  filters: ProductFilters = {},
) {
  let query = supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .eq("is_suspended", false)
    .order("published_at", { ascending: false })
    .limit(24);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  const keyword = filters.keyword ? sanitizeSearchKeyword(filters.keyword) : "";
  if (keyword) {
    query = query.or(
      `title.ilike.%${keyword}%,summary.ilike.%${keyword}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPublishedProduct(supabase: Service, id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .eq("is_suspended", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listSellerProducts(supabase: Service) {
  const sellerId = await getCurrentUserId(supabase);
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, title, summary, category, price_cents, status, review_notes, is_suspended, created_at",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Create a product draft plus its private fulfillment secret, then submit it
 * for review. The secret (license code / link) lives in product_secrets and is
 * never exposed by public queries.
 */
export async function createProductForReview(
  supabase: Service,
  input: ProductInput,
) {
  const parsed = parseProductInput(input);
  const sellerId = await getCurrentUserId(supabase);

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      category: parsed.category,
      description: parsed.description,
      price_cents: Math.round(parsed.priceYuan * 100),
      seller_id: sellerId,
      status: "draft",
      summary: parsed.summary,
      title: parsed.title,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: secretError } = await supabase
    .from("product_secrets")
    .upsert({ payload: parsed.fulfillment.trim(), product_id: product.id });

  if (secretError) {
    throw new Error(secretError.message);
  }

  const { data: submitted, error: submitError } = await supabase
    .from("products")
    .update({ status: "pending_review" })
    .eq("id", product.id)
    .eq("seller_id", sellerId)
    .select()
    .single();

  if (submitError) {
    throw new Error(submitError.message);
  }

  logBusinessEvent("product.submitted", { productId: product.id });

  return submitted;
}

export async function purchaseProduct(supabase: Service, productId: string) {
  const { data, error } = await supabase.rpc("purchase_product", {
    target_product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function confirmProductPurchase(
  supabase: Service,
  purchaseId: string,
) {
  const { data, error } = await supabase.rpc("confirm_product_purchase", {
    purchase_id: purchaseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  logBusinessEvent("product.purchased", { purchaseId });

  return data;
}

export async function listBuyerPurchases(supabase: Service, buyerId?: string) {
  const resolvedBuyerId = buyerId ?? (await getCurrentUserId(supabase));
  const { data, error } = await supabase
    .from("product_purchases")
    .select(
      "id, product_id, amount_cents, status, delivered_payload, created_at, products(title)",
    )
    .eq("buyer_id", resolvedBuyerId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingOptionalMarketplaceTable(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return data ?? [];
}

function isMissingOptionalMarketplaceTable(message: string) {
  return (
    message.includes("public.product_purchases") ||
    message.includes("public.products")
  );
}
