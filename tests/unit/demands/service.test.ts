import { describe, expect, it } from "vitest";

import {
  getCustomerDemandQuoteContext,
  getPublishedDemandDetail,
  listCustomerDemands,
  listPublishedDemands,
} from "@/lib/domain/demands/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeDemandService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(
    private readonly result: QueryResult | SingleQueryResult = {
      data: null,
      error: null,
    },
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

  lte(column: string, value: unknown) {
    this.calls.push({ method: "lte", value: { column, value } });
    return this;
  }

  gte(column: string, value: unknown) {
    this.calls.push({ method: "gte", value: { column, value } });
    return this;
  }

  or(value: string) {
    this.calls.push({ method: "or", value });
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

  single() {
    this.calls.push({ method: "single", value: null });
    return Promise.resolve(this.result as SingleQueryResult);
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

describe("customer demand services", () => {
  it("lists customer demands newest first", async () => {
    const service = new FakeDemandService();

    await expect(
      listCustomerDemands(service as never, "customer-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "demands" });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "id, title, description, status, created_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "customer_id", value: "customer-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
  });

  it("throws backend errors when listing customer demands fails", async () => {
    const service = new FakeDemandService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      listCustomerDemands(service as never, "customer-1"),
    ).rejects.toThrow("database unavailable");
  });

  it("gets customer demand quote context", async () => {
    const service = new FakeDemandService({
      data: { id: "demand-1", status: "published", title: "Build app" },
      error: null,
    });

    await expect(
      getCustomerDemandQuoteContext(service as never, "demand-1"),
    ).resolves.toEqual({
      id: "demand-1",
      status: "published",
      title: "Build app",
    });

    expect(service.calls).toContainEqual({ method: "from", value: "demands" });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "id, title, status",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "id", value: "demand-1" },
    });
    expect(service.calls).toContainEqual({ method: "single", value: null });
  });

  it("lists published public demands with visibility filters", async () => {
    const service = new FakeDemandService();

    await expect(listPublishedDemands(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "demands" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, title, description, project_type, cooperation_mode, budget_min_cents, budget_max_cents, expected_delivery_days, published_at",
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

  it("applies public demand filters after parsing", async () => {
    const service = new FakeDemandService();

    await listPublishedDemands(service as never, {
      budgetMaxCents: 100_000,
      keyword: "AI",
      maxDeliveryDays: 14,
      projectType: "ai_app",
      publishedWithinDays: 7,
    });

    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "project_type", value: "ai_app" },
    });
    expect(service.calls).toContainEqual({
      method: "lte",
      value: { column: "budget_min_cents", value: 100_000 },
    });
    expect(service.calls).toContainEqual({
      method: "lte",
      value: { column: "expected_delivery_days", value: 14 },
    });
    expect(service.calls).toContainEqual({
      method: "or",
      value: "title.ilike.%AI%,description.ilike.%AI%",
    });
    expect(service.calls.some((call) => call.method === "gte")).toBe(true);
  });

  it("sanitizes public demand keyword filters before building PostgREST expressions", async () => {
    const service = new FakeDemandService();

    await listPublishedDemands(service as never, {
      keyword: "AI, CRM (beta) 100%",
    });

    expect(service.calls).toContainEqual({
      method: "or",
      value: "title.ilike.%AI CRM beta 100%,description.ilike.%AI CRM beta 100%",
    });
  });

  it("gets only published and non-suspended public demand detail", async () => {
    const service = new FakeDemandService({
      data: { id: "demand-1", title: "Build AI app" },
      error: null,
    });

    await expect(
      getPublishedDemandDetail(service as never, "demand-1"),
    ).resolves.toEqual({ id: "demand-1", title: "Build AI app" });

    expect(service.calls).toContainEqual({ method: "from", value: "demands" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "title, description, project_type, cooperation_mode, budget_min_cents, budget_max_cents, expected_delivery_days, published_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "id", value: "demand-1" },
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
