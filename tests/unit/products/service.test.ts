import { describe, expect, it } from "vitest";

import {
  getPublishedProduct,
  listBuyerPurchases,
  listPublishedProducts,
} from "@/lib/domain/products/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
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
    private readonly result: QueryResult | SingleQueryResult = {
      data: null,
      error: null,
    },
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
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", value: count });
    return this;
  }

  or(value: string) {
    this.calls.push({ method: "or", value });
    return this;
  }

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", value: null });
    return Promise.resolve(this.result as SingleQueryResult);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result as QueryResult).then(
      onfulfilled,
      onrejected,
    );
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

describe("public product services", () => {
  it("lists published public products with visibility filters", async () => {
    const service = new FakeProductService();

    await expect(listPublishedProducts(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "products" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, seller_id, title, summary, description, category, price_cents, delivery_type, published_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "status", value: "published" },
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "is_suspended", value: false },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "published_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 24 });
  });

  it("applies public product filters after parsing", async () => {
    const service = new FakeProductService();

    await listPublishedProducts(service as never, {
      category: "automation",
      keyword: "CRM",
    });

    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "category", value: "automation" },
    });
    expect(service.calls).toContainEqual({
      method: "or",
      value: "title.ilike.%CRM%,summary.ilike.%CRM%",
    });
  });

  it("sanitizes public product keyword filters before building PostgREST expressions", async () => {
    const service = new FakeProductService();

    await listPublishedProducts(service as never, {
      keyword: "CRM, AI (demo) 100%",
    });

    expect(service.calls).toContainEqual({
      method: "or",
      value: "title.ilike.%CRM AI demo 100%,summary.ilike.%CRM AI demo 100%",
    });
  });

  it("gets only published and non-suspended public product detail", async () => {
    const service = new FakeProductService({
      data: { id: "product-1", title: "AI CRM" },
      error: null,
    });

    await expect(
      getPublishedProduct(service as never, "product-1"),
    ).resolves.toEqual({ id: "product-1", title: "AI CRM" });

    expect(service.calls).toContainEqual({ method: "from", value: "products" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, seller_id, title, summary, description, category, price_cents, delivery_type, published_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "id", value: "product-1" },
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "status", value: "published" },
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "is_suspended", value: false },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });
});
