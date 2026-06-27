import { describe, expect, it } from "vitest";

import { listCustomerDemands } from "@/lib/domain/demands/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeDemandService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(private readonly result: QueryResult = { data: null, error: null }) {}

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
});
