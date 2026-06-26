import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

/**
 * Read-only queries for the order detail page. They run with the caller's
 * RLS-scoped client (order participants only) and back the order-collaboration
 * view, keeping the page free of inline data access.
 */

type Service = SupabaseClient<Database>;

export async function getOrderForParticipant(service: Service, orderId: string) {
  const { data, error } = await service
    .from("orders")
    .select("id, amount_cents, status, customer_id, developer_id, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listOrderMessages(service: Service, orderId: string) {
  const { data, error } = await service
    .from("order_messages")
    .select("id, body, sender_id, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listOrderAttachments(service: Service, orderId: string) {
  const { data, error } = await service
    .from("order_attachments")
    .select("id, file_name, storage_path, message_id, uploader_id, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listOrderDeliveries(service: Service, orderId: string) {
  const { data, error } = await service
    .from("deliveries")
    .select("id, version, notes, delivery_url, is_current, created_at")
    .eq("order_id", orderId)
    .order("version", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getOrderReviewByAuthor(
  service: Service,
  orderId: string,
  authorId: string,
) {
  const { data, error } = await service
    .from("reviews")
    .select("id, rating, body")
    .eq("order_id", orderId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
