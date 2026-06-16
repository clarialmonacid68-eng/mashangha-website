import { describe, expect, it } from "vitest";

import {
  canRetryFailedRefund,
  evaluateRefundEligibility,
  refundFailureOutcome,
} from "@/lib/domain/refunds/policy";

describe("refund eligibility policy", () => {
  it("rejects unpaid orders", () => {
    expect(
      evaluateRefundEligibility({
        orderStatus: "pending_payment",
        paidAmountCents: 0,
        paymentStatus: "pending",
        requestedAmountCents: 500_000,
      }),
    ).toEqual({
      allowed: false,
      reason: "未支付订单不可退款",
    });
  });

  it("rejects normal refunds after profit sharing completed", () => {
    expect(
      evaluateRefundEligibility({
        orderStatus: "completed",
        paidAmountCents: 500_000,
        paymentStatus: "succeeded",
        requestedAmountCents: 500_000,
        shareStatus: "succeeded",
      }),
    ).toEqual({
      allowed: false,
      reason: "已完成分账订单不能走普通退款",
    });
  });

  it("requires first refund amount to equal the paid amount", () => {
    expect(
      evaluateRefundEligibility({
        orderStatus: "delivered",
        paidAmountCents: 500_000,
        paymentStatus: "succeeded",
        requestedAmountCents: 300_000,
      }),
    ).toEqual({
      allowed: false,
      reason: "首版退款金额必须等于订单实付金额",
    });
  });

  it("allows full refunds before profit sharing", () => {
    expect(
      evaluateRefundEligibility({
        orderStatus: "disputed",
        paidAmountCents: 500_000,
        paymentStatus: "succeeded",
        requestedAmountCents: 500_000,
      }),
    ).toEqual({ allowed: true });
  });

  it("maps provider refund failure back to manual review", () => {
    expect(refundFailureOutcome()).toEqual({
      nextOrderStatus: "refund_review",
      nextRefundStatus: "failed",
    });
  });

  it("allows refund retry only when an admin confirms the reason", () => {
    expect(
      canRetryFailedRefund({
        confirmationReason: "已核对渠道失败原因，可重新发起退款。",
        isAdmin: true,
      }),
    ).toEqual({ allowed: true });

    expect(
      canRetryFailedRefund({
        confirmationReason: "已核对渠道失败原因，可重新发起退款。",
        isAdmin: false,
      }),
    ).toEqual({
      allowed: false,
      reason: "只有管理员可以重试退款",
    });

    expect(
      canRetryFailedRefund({
        confirmationReason: "",
        isAdmin: true,
      }),
    ).toEqual({
      allowed: false,
      reason: "重试退款前必须确认失败原因",
    });
  });
});
