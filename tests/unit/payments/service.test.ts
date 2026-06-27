import { describe, expect, it } from "vitest";

import {
  confirmMockPaymentForCurrentUser,
  createOrderPayment,
} from "@/lib/payments/service";
import type { PaymentProvider } from "@/lib/payments/provider";

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

type RpcResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

class FakePaymentUserClient {
  readonly auth = {
    getUser: async () => ({
      data: { user: this.user },
      error: null,
    }),
  };

  constructor(private readonly user: { id: string } | null) {}
}

class FakePaymentService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(private readonly results: SingleQueryResult[]) {}

  from(table: string) {
    this.calls.push({ method: "from", value: table });
    return this;
  }

  select(columns: string) {
    this.calls.push({ method: "select", value: columns });
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push({ method: "eq", value: { column, value } });
    return this;
  }

  single() {
    this.calls.push({ method: "single", value: null });
    return Promise.resolve(
      this.results.shift() ?? { data: null, error: null },
    );
  }
}

class FakeCreatePaymentService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(
    private readonly queryResult: SingleQueryResult,
    private readonly rpcResult: RpcResult,
  ) {}

  from(table: string) {
    this.calls.push({ method: "from", value: table });
    return this;
  }

  select(columns: string) {
    this.calls.push({ method: "select", value: columns });
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push({ method: "eq", value: { column, value } });
    return this;
  }

  single() {
    this.calls.push({ method: "single", value: null });
    return Promise.resolve(this.queryResult);
  }

  rpc(name: string, args: Record<string, unknown>) {
    this.calls.push({ method: "rpc", value: { args, name } });
    return Promise.resolve(this.rpcResult);
  }
}

class FakeProvider implements PaymentProvider {
  async createPayment() {
    return {
      amountCents: 120_000,
      checkoutUrl: "/api/payments/mock/confirm?payment=new-provider-id",
      idempotencyKey: "pay-order-1",
      providerPaymentId: "new-provider-id",
      status: "pending" as const,
    };
  }

  async queryPayment() {
    return {
      amountCents: 120_000,
      providerPaymentId: "new-provider-id",
      status: "pending" as const,
    };
  }

  async closePayment() {
    return {
      amountCents: 120_000,
      providerPaymentId: "new-provider-id",
      status: "closed" as const,
    };
  }

  async refund() {
    return {
      amountCents: 120_000,
      idempotencyKey: "refund-order-1",
      providerRefundId: "refund-1",
      status: "succeeded" as const,
    };
  }

  async queryRefund() {
    return {
      amountCents: 120_000,
      providerRefundId: "refund-1",
      status: "succeeded" as const,
    };
  }

  async createProfitShare() {
    return {
      commissionAmountCents: 12_000,
      developerAmountCents: 108_000,
      idempotencyKey: "share-order-1",
      providerShareId: "share-1",
      status: "succeeded" as const,
    };
  }

  async queryProfitShare() {
    return {
      providerShareId: "share-1",
      status: "succeeded" as const,
    };
  }

  async downloadBill() {
    return {
      content: "",
      contentType: "text/csv",
      fileName: "bill.csv",
    };
  }
}

describe("payment confirmation service adapters", () => {
  it("rejects missing provider payment ids without querying", async () => {
    const userClient = new FakePaymentUserClient({ id: "customer-1" });
    const service = new FakePaymentService([]);

    await expect(
      confirmMockPaymentForCurrentUser(userClient as never, service as never, {
        providerPaymentId: "",
      }),
    ).resolves.toEqual({ ok: false, reason: "missing_payment" });

    expect(service.calls).toEqual([]);
  });

  it("requires an authenticated user before confirming", async () => {
    const userClient = new FakePaymentUserClient(null);
    const service = new FakePaymentService([]);

    await expect(
      confirmMockPaymentForCurrentUser(userClient as never, service as never, {
        providerPaymentId: "mock-payment-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "unauthenticated" });

    expect(service.calls).toEqual([]);
  });

  it("returns missing_payment when the stored payment is absent", async () => {
    const userClient = new FakePaymentUserClient({ id: "customer-1" });
    const service = new FakePaymentService([{ data: null, error: null }]);

    await expect(
      confirmMockPaymentForCurrentUser(userClient as never, service as never, {
        providerPaymentId: "mock-payment-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "missing_payment" });

    expect(service.calls).toContainEqual({ method: "from", value: "payments" });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "amount_cents, order_id, provider_transaction_id, status",
    });
  });

  it("returns forbidden when the payment order belongs to another customer", async () => {
    const userClient = new FakePaymentUserClient({ id: "customer-1" });
    const service = new FakePaymentService([
      {
        data: {
          amount_cents: 120_000,
          order_id: "order-1",
          provider_transaction_id: "mock-payment-1",
          status: "pending",
        },
        error: null,
      },
      {
        data: { customer_id: "customer-2" },
        error: null,
      },
    ]);

    await expect(
      confirmMockPaymentForCurrentUser(userClient as never, service as never, {
        providerPaymentId: "mock-payment-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "forbidden" });

    expect(service.calls).toContainEqual({ method: "from", value: "orders" });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "customer_id",
    });
  });
});

describe("payment creation service adapters", () => {
  it("returns the stored provider transaction id when RPC reuses an existing payment", async () => {
    const service = new FakeCreatePaymentService(
      {
        data: {
          amount_cents: 120_000,
          id: "order-1",
          is_frozen: false,
          status: "pending_payment",
        },
        error: null,
      },
      {
        data: {
          amount_cents: 120_000,
          provider_transaction_id: "existing-provider-id",
          status: "pending",
        },
        error: null,
      },
    );

    await expect(
      createOrderPayment(service as never, new FakeProvider(), {
        idempotencyKey: "pay-order-1",
        orderId: "order-1",
      }),
    ).resolves.toMatchObject({
      providerPayment: {
        amountCents: 120_000,
        providerPaymentId: "existing-provider-id",
        status: "pending",
      },
    });
  });
});
