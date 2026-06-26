import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderFileUpload } from "@/components/workspace/order-file-upload";
import {
  acceptOrderDelivery,
  completeAcceptedOrderWithMockSettlement,
  createOrderMessage,
  createOrderReview,
  rejectOrderDelivery,
  submitOrderDelivery,
  type SubmitOrderDeliveryInput,
} from "@/lib/domain/orders/service";
import { parseOptionalOrderAttachment } from "@/lib/domain/orders/form";
import {
  getOrderForParticipant,
  getOrderReviewByAuthor,
  listOrderAttachments,
  listOrderDeliveries,
  listOrderMessages,
} from "@/lib/domain/orders/queries";
import { createClient, createServiceClient } from "@/lib/auth/server";

function optionalAttachment(formData: FormData) {
  return parseOptionalOrderAttachment({
    attachmentName: formData.get("attachmentName")?.toString() ?? null,
    attachmentPath: formData.get("attachmentPath")?.toString() ?? null,
    attachmentSize: formData.get("attachmentSize")?.toString() ?? null,
    attachmentType: formData.get("attachmentType")?.toString() ?? null,
  });
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

async function acceptDelivery(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createClient();

  try {
    await acceptOrderDelivery(supabase, orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "验收失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?accepted=1`);
}

async function rejectDelivery(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const supabase = await createClient();

  if (!reason) {
    redirect(`/workspace/orders/${orderId}?error=${encodeURIComponent("请填写退回原因")}`);
  }

  try {
    await rejectOrderDelivery(supabase, orderId, reason);
  } catch (error) {
    const message = error instanceof Error ? error.message : "退回交付失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?rejected=1`);
}

async function completeSettlement(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    if (!user) {
      throw new Error("请先登录");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .single();

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (order.customer_id !== user.id) {
      throw new Error("只有订单客户可以完成模拟结算");
    }

    await completeAcceptedOrderWithMockSettlement(createServiceClient(), orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "模拟结算失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?settled=1`);
}

async function submitReview(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const body = String(formData.get("body") ?? "").trim();
  const supabase = await createClient();

  try {
    await createOrderReview(supabase, orderId, {
      body: body || null,
      isPublic: true,
      rating,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交评价失败";
    redirect(
      `/workspace/orders/${orderId}?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/orders/${orderId}?reviewed=1`);
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    accepted?: string;
    delivery?: string;
    error?: string;
    message?: string;
    rejected?: string;
    reviewed?: string;
    settled?: string;
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

  const order = await getOrderForParticipant(supabase, id);

  if (!order) {
    redirect("/workspace/settings");
  }

  const [messages, attachments, deliveries, existingReview] = await Promise.all([
    listOrderMessages(supabase, id),
    listOrderAttachments(supabase, id),
    listOrderDeliveries(supabase, id),
    getOrderReviewByAuthor(supabase, id, user.id),
  ]);

  const isDeveloper = order.developer_id === user.id;
  const isCustomer = order.customer_id === user.id;

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
      {query.accepted ? <p className="auth-message">已验收交付。</p> : null}
      {query.rejected ? <p className="auth-message">已退回交付，订单回到进行中。</p> : null}
      {query.settled ? <p className="auth-message">模拟结算已完成，订单已完成。</p> : null}
      {query.reviewed ? <p className="auth-message">评价已提交。</p> : null}

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
          <label>附件（可选）</label>
          <OrderFileUpload orderId={order.id} />
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
            <label>交付附件（可选）</label>
            <OrderFileUpload orderId={order.id} />
            <Button type="submit">提交正式交付</Button>
          </form>
        </Card>
      ) : null}

      {isCustomer && order.status === "delivered" ? (
        <Card className="settings-card">
          <h2>验收交付</h2>
          <p>确认交付物符合需求即可验收；如不符合要求，可填写原因退回开发者修改。</p>
          <form action={acceptDelivery} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <Button type="submit">验收交付</Button>
          </form>
          <form action={rejectDelivery} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <label htmlFor="reject-reason">退回原因</label>
            <textarea id="reject-reason" name="reason" required rows={3} />
            <Button type="submit" variant="secondary">
              退回交付
            </Button>
          </form>
        </Card>
      ) : null}

      {isCustomer && order.status === "accepted" ? (
        <Card className="settings-card">
          <h2>完成结算</h2>
          <p>当前为本地模拟结算，不产生真实分账或资金流转。结算完成后可对开发者评价。</p>
          <form action={completeSettlement} className="auth-form">
            <input name="orderId" type="hidden" value={order.id} />
            <Button type="submit">完成结算（模拟）</Button>
          </form>
        </Card>
      ) : null}

      {isCustomer && order.status === "completed" ? (
        <Card className="settings-card">
          <h2>评价开发者</h2>
          {existingReview ? (
            <p className="auth-message">
              已提交评价：{existingReview.rating} 星。
            </p>
          ) : (
            <form action={submitReview} className="auth-form">
              <input name="orderId" type="hidden" value={order.id} />
              <label htmlFor="rating">评分（1-5）</label>
              <select defaultValue="5" id="rating" name="rating">
                <option value="5">5 星 · 非常满意</option>
                <option value="4">4 星 · 满意</option>
                <option value="3">3 星 · 一般</option>
                <option value="2">2 星 · 不满意</option>
                <option value="1">1 星 · 很不满意</option>
              </select>
              <label htmlFor="review-body">评价内容（可选）</label>
              <textarea id="review-body" name="body" rows={3} />
              <Button type="submit">提交评价</Button>
            </form>
          )}
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
                <p>
                  <a
                    href={`/api/files/download?orderId=${order.id}&path=${encodeURIComponent(
                      attachment.storage_path,
                    )}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    下载附件
                  </a>
                </p>
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
