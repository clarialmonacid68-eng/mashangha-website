export type PaymentProviderName = "mock";
export type PaymentStatus = "pending" | "succeeded" | "closed" | "failed";
export type RefundStatus = "processing" | "succeeded" | "failed";
export type ProfitShareStatus = "processing" | "succeeded" | "failed";

export type CreatePaymentInput = {
  amountCents: number;
  idempotencyKey: string;
  orderId: string;
  subject: string;
};

export type CreatePaymentResult = {
  amountCents: number;
  checkoutUrl: string;
  idempotencyKey: string;
  providerPaymentId: string;
  status: PaymentStatus;
};

export type PaymentSnapshot = {
  amountCents: number;
  providerPaymentId: string;
  status: PaymentStatus;
};

export type RefundInput = {
  amountCents: number;
  idempotencyKey: string;
  paymentProviderId: string;
  reason: string;
};

export type RefundResult = {
  amountCents: number;
  idempotencyKey: string;
  providerRefundId: string;
  status: RefundStatus;
};

export type RefundSnapshot = {
  amountCents: number;
  providerRefundId: string;
  status: RefundStatus;
};

export type ProfitShareInput = {
  commissionAmountCents: number;
  developerAmountCents: number;
  idempotencyKey: string;
  paymentProviderId: string;
};

export type ProfitShareResult = {
  commissionAmountCents: number;
  developerAmountCents: number;
  idempotencyKey: string;
  providerShareId: string;
  status: ProfitShareStatus;
};

export type ProfitShareSnapshot = {
  providerShareId: string;
  status: ProfitShareStatus;
};

export type DownloadBillInput = {
  date: string;
};

export type BillFile = {
  content: string;
  contentType: string;
  fileName: string;
};
