import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createOrderMessage,
  submitOrderDelivery,
  type SubmitOrderDeliveryInput,
} from "@/lib/domain/orders/service";
import { createClient } from "@/lib/auth/server";

function optionalAttachment(formData: FormData) {
  const storagePath = String(formData.get("attachmentPath") ?? "").trim();
  const fileName = String(formData.get("attachmentName") ?? "").trim();

  if (!storagePath || !fileName) {
    return [];
  }

  return [
    {
      contentType: String(formData.get("attachmentType") ?? "").trim() || null,
      fileName,
      sizeBytes: Number(formData.get("attachmentSize") ?? 0),
      storagePath,
    },
  ];
}

async function postMessage(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createClient();

  try {
    await createOrderMessage(supabase, orderId, {
      attachments: optionalAttachment(formData),
      body: String(formData.get("body") ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发送留言失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?message=sent`);
}

async function deliverOrder(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createClient();
  const payload: SubmitOrderDeliveryInput = {
    attachments: optionalAttachment(formData),
    deliveryUrl: String(formData.get("deliveryUrl") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? ""),
  };

  try {
    await submitOrderDelivery(supabase, orderId, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交交付失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?delivery=submitted`);
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    delivery?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, amount_cents, status, customer_id, developer_id, created_at")
    .eq("id", id)
    .single();

  if (!order) {
    redirect("/workspace/settings");
  }

  const [{ data: messages }, { data: attachments }, { data: deliveries }] =
    await Promise.all([
      supabase
        .from("order_messages")
        .select("id, body, sender_id, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_attachments")
        .select("id, file_name, storage_path, message_id, uploader_id, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("deliveries")
        .select("id, version, notes, delivery_url, is_current, created_at")
        .eq("order_id", id)
        .order("version", { ascending: false }),
    ]);

  const isDeveloper = order.developer_id === user.id;

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">订单协作</p>
        <h1>订单详情</h1>
        <p className="auth-intro">
          留言、附件和正式交付都会记录在订单时间线中。
        </p>
      </div>

      {query.error ? (
        <p className="auth-message">{decodeURIComponent(query.error)}</p>
      ) : null}
      {query.message ? <p className="auth-message">留言已发送。</p> : null}
      {query.delivery ? <p className="auth-message">交付已提交。</p> : null}

      <Card className="settings-card">
        <span className="status-badge">{order.status}</span>
        <p>订单号：{order.id}</p>
        <p>订单金额：¥{Math.round(order.amount_cents / 100).toLocaleString("zh-CN")}</p>
        <p>客户：{order.customer_id}</p>
        <p>开发者：{order.developer_id}</p>
      </Card>

      <Card className="settings-card">
        <h2>发送留言</h2>
        <form action={postMessage} className="auth-form">
          <input name="orderId" type="hidden" value={order.id} />
          <label htmlFor="body">留言内容</label>
          <textarea id="body" name="body" required rows={4} />
          <label htmlFor="attachmentName">附件名称（可选）</label>
          <input id="attachmentName" name="attachmentName" placeholder="scope.pdf" />
          <label htmlFor="attachmentPath">附件路径（可选）</label>
          <input
            id="attachmentPath"
            name="attachmentPath"
            placeholder={`orders/${order.id}/file.pdf`}
          />
          <input name="attachmentType" type="hidden" value="application/pdf" />
          <input name="attachmentSize" type="hidden" value="0" />
          <Button type="submit">发送留言</Button>
        </form>
      </Card>

      {isDeveloper && order.status === "in_progress" ? (
        <Card className="settings-card">
          <h2>正式交付</h2>
          <form action={deliverOrder} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <label htmlFor="notes">交付说明</label>
            <textarea id="notes" name="notes" required rows={4} />
            <label htmlFor="deliveryUrl">交付链接</label>
            <input
              id="deliveryUrl"
              name="deliveryUrl"
              placeholder="https://example.com/release"
            />
            <label htmlFor="deliveryAttachmentName">附件名称（可选）</label>
            <input id="deliveryAttachmentName" name="attachmentName" />
            <label htmlFor="deliveryAttachmentPath">附件路径（可选）</label>
            <input id="deliveryAttachmentPath" name="attachmentPath" />
            <input name="attachmentType" type="hidden" value="application/zip" />
            <input name="attachmentSize" type="hidden" value="0" />
            <Button type="submit">提交正式交付</Button>
          </form>
        </Card>
      ) : null}

      <Card className="settings-card">
        <h2>留言时间线</h2>
        {messages?.length ? (
          <div className="workspace-list">
            {messages.map((message) => (
              <article className="message-preview" key={message.id}>
                <strong>{message.sender_id}</strong>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>还没有留言。</p>
        )}
      </Card>

      <Card className="settings-card">
        <h2>交付版本</h2>
        {deliveries?.length ? (
          <div className="workspace-list">
            {deliveries.map((delivery) => (
              <article className="message-preview" key={delivery.id}>
                <strong>
                  V{delivery.version}
                  {delivery.is_current ? "（当前版本）" : ""}
                </strong>
                <p>{delivery.notes}</p>
                {delivery.delivery_url ? <p>{delivery.delivery_url}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p>开发者还没有提交正式交付。</p>
        )}
      </Card>

      <Card className="settings-card">
        <h2>附件记录</h2>
        {attachments?.length ? (
          <div className="workspace-list">
            {attachments.map((attachment) => (
              <article className="message-preview" key={attachment.id}>
                <strong>{attachment.file_name}</strong>
                <p>{attachment.storage_path}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>暂无附件。</p>
        )}
      </Card>
    </div>
  );
}
