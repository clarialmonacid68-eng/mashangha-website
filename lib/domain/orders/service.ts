import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { createServiceInAppNotification } from "@/lib/notifications/repository";
import { createOrderStoragePath } from "@/lib/storage/policy";

type AttachmentInput = {
  contentType?: string | null;
  fileName: string;
  sizeBytes: number;
  storagePath: string;
};

export type CreateOrderMessageInput = {
  attachments?: AttachmentInput[];
  body: string;
};

export type CreateOrderFileUploadInput = {
  contentType?: string | null;
  fileName: string;
  orderId: string;
  sizeBytes: number;
};

export type SubmitOrderDeliveryInput = {
  attachments?: AttachmentInput[];
  deliveryUrl?: string | null;
  notes: string;
};

export type CreateOrderReviewInput = {
  body?: string | null;
  isPublic?: boolean;
  rating: number;
};

type DeliveryRow = Database["public"]["Tables"]["deliveries"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

async function getCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("请先登录");
  }

  return user.id;
}

async function assertCanAccessOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("无权访问该订单");
  }
}

function normalizeAttachments(attachments: AttachmentInput[] = []) {
  return attachments.map((attachment) => ({
    content_type: attachment.contentType ?? null,
    file_name: attachment.fileName.trim(),
    size_bytes: attachment.sizeBytes,
    storage_path: attachment.storagePath,
  }));
}

export async function createOrderFileUploadRequest(
  supabase: SupabaseClient,
  input: CreateOrderFileUploadInput,
) {
  await assertCanAccessOrder(supabase, input.orderId);
  const storagePath = createOrderStoragePath(input);

  return {
    expiresIn: 600,
    signedUploadUrl: `/api/files/sign?path=${encodeURIComponent(storagePath)}`,
    storagePath,
  };
}

export async function createOrderMessage(
  supabase: SupabaseClient,
  orderId: string,
  input: CreateOrderMessageInput,
) {
  const senderId = await getCurrentUserId(supabase);
  const body = input.body.trim();

  if (!body) {
    throw new Error("留言内容不能为空");
  }

  const { data: message, error } = await supabase
    .from("order_messages")
    .insert({
      body,
      order_id: orderId,
      sender_id: senderId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const attachments = normalizeAttachments(input.attachments);
  if (attachments.length) {
    const { error: attachmentError } = await supabase
      .from("order_attachments")
      .insert(
        attachments.map((attachment) => ({
          ...attachment,
          message_id: message.id,
          order_id: orderId,
          uploader_id: senderId,
        })),
      );

    if (attachmentError) {
      throw new Error(attachmentError.message);
    }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("customer_id, developer_id")
    .eq("id", orderId)
    .single();
  const recipientId =
    order?.customer_id === senderId ? order.developer_id : order?.customer_id;

  if (recipientId) {
    await createServiceInAppNotification({
      actorId: senderId,
      body,
      eventKey: `message:${message.id}`,
      metadata: { messageId: message.id, orderId },
      recipientId,
      title: "订单有新留言",
      type: "message_created",
    });
  }

  return message;
}

export async function submitOrderDelivery(
  supabase: SupabaseClient,
  orderId: string,
  input: SubmitOrderDeliveryInput,
) {
  const developerId = await getCurrentUserId(supabase);

  if (!input.deliveryUrl && !input.attachments?.length) {
    throw new Error("正式交付必须包含附件或交付链接");
  }

  const { data, error } = await supabase.rpc("submit_order_delivery", {
    delivery_notes: input.notes,
    delivery_url: input.deliveryUrl ?? null,
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const delivery = data as DeliveryRow;
  const attachments = normalizeAttachments(input.attachments);
  if (attachments.length) {
    const { error: attachmentError } = await supabase
      .from("order_attachments")
      .insert(
        attachments.map((attachment) => ({
          ...attachment,
          message_id: null,
          order_id: orderId,
          uploader_id: developerId,
        })),
      );

    if (attachmentError) {
      throw new Error(attachmentError.message);
    }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("id", orderId)
    .single();

  if (order?.customer_id) {
    await createServiceInAppNotification({
      actorId: developerId,
      body: input.notes,
      eventKey: `delivery:${delivery.id}:submitted`,
      metadata: { deliveryId: delivery.id, orderId },
      recipientId: order.customer_id,
      title: "订单已提交正式交付",
      type: "delivery_submitted",
    });
  }

  return delivery;
}

export async function acceptOrderDelivery(
  supabase: SupabaseClient,
  orderId: string,
) {
  const { data, error } = await supabase.rpc("accept_order_delivery", {
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.developer_id && data?.customer_id) {
    await createServiceInAppNotification({
      actorId: data.customer_id,
      eventKey: `delivery:${orderId}:accepted`,
      metadata: { orderId },
      recipientId: data.developer_id,
      title: "客户已验收交付",
      type: "delivery_accepted",
    });
  }

  return data;
}

export async function completeAcceptedOrderWithMockSettlement(
  supabase: SupabaseClient,
  orderId: string,
) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, amount_cents, commission_bps, status")
    .eq("id", orderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (order.status !== "accepted") {
    throw new Error("只有已验收订单可以模拟结算");
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, status")
    .eq("order_id", orderId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? "缺少成功支付记录");
  }

  const commissionAmount = Math.round(
    (order.amount_cents * order.commission_bps) / 10_000,
  );
  const developerAmount = order.amount_cents - commissionAmount;

  const { error: shareError } = await supabase.from("profit_shares").upsert({
    commission_amount_cents: commissionAmount,
    developer_amount_cents: developerAmount,
    order_id: orderId,
    payment_id: payment.id,
    platform_share_no: `mock-share-${orderId}`,
    status: "succeeded",
  });

  if (shareError) {
    throw new Error(shareError.message);
  }

  const completedAt = new Date().toISOString();
  const { data: completed, error: updateError } = await supabase
    .from("orders")
    .update({ completed_at: completedAt, status: "completed" })
    .eq("id", orderId)
    .eq("status", "accepted")
    .select()
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase.from("order_status_history").insert({
    from_status: "accepted",
    order_id: orderId,
    reason: "mock settlement completed",
    to_status: "completed",
  });

  if (completed.developer_id) {
    await createServiceInAppNotification({
      eventKey: `settlement:${orderId}:completed`,
      metadata: {
        commissionAmountCents: commissionAmount,
        developerAmountCents: developerAmount,
        orderId,
      },
      recipientId: completed.developer_id,
      title: "模拟结算已完成",
      type: "profit_share_updated",
    });
  }

  if (completed.customer_id) {
    await createServiceInAppNotification({
      eventKey: `settlement:${orderId}:customer_completed`,
      metadata: { orderId },
      recipientId: completed.customer_id,
      title: "订单已完成",
      type: "profit_share_updated",
    });
  }

  return completed as OrderRow;
}

export async function rejectOrderDelivery(
  supabase: SupabaseClient,
  orderId: string,
  reason: string,
) {
  const { data, error } = await supabase.rpc("reject_order_delivery", {
    rejection_reason: reason,
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createOrderReview(
  supabase: SupabaseClient,
  orderId: string,
  input: CreateOrderReviewInput,
) {
  const { data, error } = await supabase.rpc("create_order_review", {
    public_review: input.isPublic ?? true,
    rating_value: input.rating,
    review_body: input.body ?? null,
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
