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

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  queryPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  closePayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  refund(input: RefundInput): Promise<RefundResult>;
  queryRefund(providerRefundId: string): Promise<RefundSnapshot>;
  createProfitShare(input: ProfitShareInput): Promise<ProfitShareResult>;
  queryProfitShare(providerShareId: string): Promise<ProfitShareSnapshot>;
  downloadBill(input: DownloadBillInput): Promise<BillFile>;
}
