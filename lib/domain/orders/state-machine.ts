import type { Database } from "@/lib/db/types";
import type { OrderEvent } from "@/lib/domain/orders/events";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

const transitions: Partial<Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>>> = {
  accepted: {
    profit_share_started: "sharing",
  },
  delivered: {
    accept_delivery: "accepted",
    approve_refund: "refund_review",
    open_dispute: "disputed",
    reject_delivery: "in_progress",
  },
  disputed: {
    approve_refund: "refund_review",
    resolve_accept: "accepted",
    resolve_continue: "in_progress",
  },
  in_progress: {
    approve_refund: "refund_review",
    deliver: "delivered",
    open_dispute: "disputed",
  },
  pending_payment: {
    payment_expired: "closed",
    payment_succeeded: "in_progress",
  },
  refunded: {},
  refunding: {
    refund_failed: "refund_review",
    refund_succeeded: "refunded",
  },
  refund_review: {
    refund_started: "refunding",
  },
  share_failed: {
    retry_profit_share: "sharing",
  },
  sharing: {
    profit_share_failed: "share_failed",
    profit_share_succeeded: "completed",
  },
};

export function transition(status: OrderStatus, event: OrderEvent): OrderStatus {
  const next = transitions[status]?.[event];

  if (!next) {
    throw new Error(`Invalid order transition: ${status} + ${event}`);
  }

  return next;
}
