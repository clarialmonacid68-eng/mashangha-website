import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
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

type DeliveryRow = Database["public"]["Tables"]["deliveries"]["Row"];

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

  return delivery;
}
