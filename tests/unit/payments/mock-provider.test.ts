import { describe, expect, it } from "vitest";

import { MockPaymentProvider } from "@/lib/payments/mock-provider";

describe("MockPaymentProvider", () => {
  it("returns the same payment result for repeated idempotency keys", async () => {
    const provider = new MockPaymentProvider();
    const first = await provider.createPayment({
      amountCents: 120_000,
      idempotencyKey: "pay-order-1",
      orderId: "order-1",
      subject: "订单全额付款",
    });
    const second = await provider.createPayment({
      amountCents: 120_000,
      idempotencyKey: "pay-order-1",
      orderId: "order-1",
      subject: "订单全额付款",
    });

    expect(second).toEqual(first);
    await expect(
      provider.queryPayment(first.providerPaymentId),
    ).resolves.toMatchObject({
      amountCents: 120_000,
      providerPaymentId: first.providerPaymentId,
      status: "pending",
    });
  });

  it("supports idempotent close, refund and profit-share operations", async () => {
    const provider = new MockPaymentProvider();
    const payment = await provider.createPayment({
      amountCents: 90_000,
      idempotencyKey: "pay-order-2",
      orderId: "order-2",
      subject: "订单全额付款",
    });

    await expect(provider.closePayment(payment.providerPaymentId)).resolves.toMatchObject({
      providerPaymentId: payment.providerPaymentId,
      status: "closed",
    });

    const refundA = await provider.refund({
      amountCents: 90_000,
      idempotencyKey: "refund-order-2",
      paymentProviderId: payment.providerPaymentId,
      reason: "测试退款",
    });
    const refundB = await provider.refund({
      amountCents: 90_000,
      idempotencyKey: "refund-order-2",
      paymentProviderId: payment.providerPaymentId,
      reason: "测试退款",
    });
    expect(refundB).toEqual(refundA);
    await expect(provider.queryRefund(refundA.providerRefundId)).resolves.toMatchObject({
      amountCents: 90_000,
      status: "succeeded",
    });

    const shareA = await provider.createProfitShare({
      commissionAmountCents: 9_000,
      developerAmountCents: 81_000,
      idempotencyKey: "share-order-2",
      paymentProviderId: payment.providerPaymentId,
    });
    const shareB = await provider.createProfitShare({
      commissionAmountCents: 9_000,
      developerAmountCents: 81_000,
      idempotencyKey: "share-order-2",
      paymentProviderId: payment.providerPaymentId,
    });
    expect(shareB).toEqual(shareA);
    await expect(provider.queryProfitShare(shareA.providerShareId)).resolves.toMatchObject({
      status: "succeeded",
    });
    await expect(provider.downloadBill({ date: "2026-06-16" })).resolves.toMatchObject({
      contentType: "text/csv",
      fileName: "mock-bill-2026-06-16.csv",
    });
  });
});
