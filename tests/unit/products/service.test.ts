import { describe, expect, it } from "vitest";

import { listBuyerPurchases } from "@/lib/domain/products/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeProductService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  readonly auth = {
    getUser: async () => ({
      data: { user: this.user },
      error: this.authError,
    }),
  };

  constructor(
    private readonly result: QueryResult = { data: null, error: null },
    private readonly user: { id: string } | null = { id: "buyer-1" },
    private readonly authError: { message: string } | null = null,
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

  order(column: string, options: { ascending: boolean }) {
    this.calls.push({ method: "order", value: { column, options } });
    return Promise.resolve(this.result);
  }
}

describe("product purchase services", () => {
  it("lists buyer purchases newest first with product title", async () => {
    const service = new FakeProductService();

    await expect(listBuyerPurchases(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "product_purchases",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, product_id, amount_cents, status, delivered_payload, created_at, products(title)",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "buyer_id", value: "buyer-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
  });

  it("requires a logged-in buyer before listing purchases", async () => {
    const service = new FakeProductService(
      { data: null, error: null },
      null,
    );

    await expect(listBuyerPurchases(service as never)).rejects.toThrow(
      "请先登录后再操作产品",
    );
    expect(service.calls).toEqual([]);
  });

  it("throws backend errors when listing buyer purchases fails", async () => {
    const service = new FakeProductService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(listBuyerPurchases(service as never)).rejects.toThrow(
      "database unavailable",
    );
  });
});
