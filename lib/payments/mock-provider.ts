import type { PaymentProvider } from "@/lib/payments/provider";
import type {
  BillFile,
  CreatePaymentInput,
  CreatePaymentResult,
  DownloadBillInput,
  PaymentSnapshot,
  ProfitShareInput,
  ProfitShareResult,
  ProfitShareSnapshot,
  RefundInput,
  RefundResult,
  RefundSnapshot,
} from "@/lib/payments/types";

export class MockPaymentProvider implements PaymentProvider {
  private paymentsByIdempotencyKey = new Map<string, CreatePaymentResult>();
  private paymentsById = new Map<string, PaymentSnapshot>();
  private refundsByIdempotencyKey = new Map<string, RefundResult>();
  private refundsById = new Map<string, RefundSnapshot>();
  private sharesByIdempotencyKey = new Map<string, ProfitShareResult>();
  private sharesById = new Map<string, ProfitShareSnapshot>();

  seedPayment(snapshot: PaymentSnapshot) {
    this.paymentsById.set(snapshot.providerPaymentId, snapshot);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const existing = this.paymentsByIdempotencyKey.get(input.idempotencyKey);

    if (existing) {
      return existing;
    }

    const providerPaymentId = `mock_pay_${crypto.randomUUID()}`;
    const result: CreatePaymentResult = {
      amountCents: input.amountCents,
      checkoutUrl: `/api/payments/mock/confirm?payment=${providerPaymentId}`,
      idempotencyKey: input.idempotencyKey,
      providerPaymentId,
      status: "pending",
    };
    this.paymentsByIdempotencyKey.set(input.idempotencyKey, result);
    this.paymentsById.set(providerPaymentId, {
      amountCents: input.amountCents,
      providerPaymentId,
      status: "pending",
    });

    return result;
  }

  async queryPayment(providerPaymentId: string): Promise<PaymentSnapshot> {
    const snapshot = this.paymentsById.get(providerPaymentId);

    if (!snapshot) {
      throw new Error("Mock payment not found");
    }

    return snapshot;
  }

  async closePayment(providerPaymentId: string): Promise<PaymentSnapshot> {
    const snapshot = await this.queryPayment(providerPaymentId);

    if (snapshot.status === "succeeded") {
      return snapshot;
    }

    const closed = { ...snapshot, status: "closed" as const };
    this.paymentsById.set(providerPaymentId, closed);
    return closed;
  }

  async confirmPayment(providerPaymentId: string): Promise<PaymentSnapshot> {
    const snapshot = await this.queryPayment(providerPaymentId);

    if (snapshot.status === "closed") {
      return snapshot;
    }

    const succeeded = { ...snapshot, status: "succeeded" as const };
    this.paymentsById.set(providerPaymentId, succeeded);
    return succeeded;
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const existing = this.refundsByIdempotencyKey.get(input.idempotencyKey);

    if (existing) {
      return existing;
    }

    await this.queryPayment(input.paymentProviderId);
    const providerRefundId = `mock_refund_${crypto.randomUUID()}`;
    const result: RefundResult = {
      amountCents: input.amountCents,
      idempotencyKey: input.idempotencyKey,
      providerRefundId,
      status: "succeeded",
    };
    this.refundsByIdempotencyKey.set(input.idempotencyKey, result);
    this.refundsById.set(providerRefundId, {
      amountCents: input.amountCents,
      providerRefundId,
      status: "succeeded",
    });

    return result;
  }

  async queryRefund(providerRefundId: string): Promise<RefundSnapshot> {
    const snapshot = this.refundsById.get(providerRefundId);

    if (!snapshot) {
      throw new Error("Mock refund not found");
    }

    return snapshot;
  }

  async createProfitShare(input: ProfitShareInput): Promise<ProfitShareResult> {
    const existing = this.sharesByIdempotencyKey.get(input.idempotencyKey);

    if (existing) {
      return existing;
    }

    await this.queryPayment(input.paymentProviderId);
    const providerShareId = `mock_share_${crypto.randomUUID()}`;
    const result: ProfitShareResult = {
      commissionAmountCents: input.commissionAmountCents,
      developerAmountCents: input.developerAmountCents,
      idempotencyKey: input.idempotencyKey,
      providerShareId,
      status: "succeeded",
    };
    this.sharesByIdempotencyKey.set(input.idempotencyKey, result);
    this.sharesById.set(providerShareId, {
      providerShareId,
      status: "succeeded",
    });

    return result;
  }

  async queryProfitShare(providerShareId: string): Promise<ProfitShareSnapshot> {
    const snapshot = this.sharesById.get(providerShareId);

    if (!snapshot) {
      throw new Error("Mock profit share not found");
    }

    return snapshot;
  }

  async downloadBill(input: DownloadBillInput): Promise<BillFile> {
    return {
      content: "provider_payment_id,status,amount_cents\n",
      contentType: "text/csv",
      fileName: `mock-bill-${input.date}.csv`,
    };
  }
}
