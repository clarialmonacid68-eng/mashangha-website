import { describe, expect, it } from "vitest";

import { confirmMockPaymentForCurrentUser } from "@/lib/payments/service";

type SingleQueryResult = {
  data: unknown | null;
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
