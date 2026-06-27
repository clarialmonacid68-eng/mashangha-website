import { describe, expect, it } from "vitest";

import {
  getCustomerDemandQuoteContext,
  listCustomerDemands,
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

  order(column: string, options: { ascending: boolean }) {
    this.calls.push({ method: "order", value: { column, options } });
    return Promise.resolve(this.result as QueryResult);
  }

  single() {
    this.calls.push({ method: "single", value: null });
    return Promise.resolve(this.result as SingleQueryResult);
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
});
