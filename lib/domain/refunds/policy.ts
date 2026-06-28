import type { Database } from "@/lib/db/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type ShareStatus = Database["public"]["Enums"]["share_status"];

export type RefundEligibilityInput = {
  orderStatus: OrderStatus;
  paidAmountCents: number;
  paymentStatus?: PaymentStatus;
  requestedAmountCents: number;
  shareStatus?: ShareStatus;
};

export type RefundEligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function evaluateRefundEligibility(
  input: RefundEligibilityInput,
): RefundEligibilityResult {
  if (
    input.orderStatus === "pending_payment" ||
    input.paymentStatus !== "succeeded" ||
    input.paidAmountCents <= 0
  ) {
    return { allowed: false, reason: "未支付订单不可退款" };
  }

  if (input.shareStatus === "succeeded") {
    return { allowed: false, reason: "已完成分账订单不能走普通退款" };
  }

  if (input.requestedAmountCents !== input.paidAmountCents) {
    return { allowed: false, reason: "首版退款金额必须等于订单实付金额" };
  }

  return { allowed: true };
}

export function refundFailureOutcome() {
  return {
    nextOrderStatus: "refund_review" as const,
    nextRefundStatus: "failed" as const,
  };
}

export function canRetryFailedRefund(input: {
  confirmationReason: string;
  isAdmin: boolean;
}): RefundEligibilityResult {
  if (!input.isAdmin) {
    return { allowed: false, reason: "只有管理员可以重试退款" };
  }

  if (!input.confirmationReason.trim()) {
    return { allowed: false, reason: "重试退款前必须确认失败原因" };
  }

  return { allowed: true };
}
