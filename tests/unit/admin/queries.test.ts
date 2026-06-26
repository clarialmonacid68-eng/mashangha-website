import { describe, expect, it } from "vitest";

import {
  listAdminDemands,
  listAdminDisputes,
  listAdminOrders,
  listAdminProducts,
} from "@/lib/domain/admin/queries";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeAdminListService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(private readonly result: QueryResult) {}

  from(table: string) {
    this.calls.push({ method: "from", value: table });
    return this;
  }

  select(columns: string) {
    this.calls.push({ method: "select", value: columns });
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.calls.push({ method: "order", value: { column, options } });
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", value: count });
    return Promise.resolve(this.result);
  }
}

describe("admin list queries", () => {
  it("returns an empty array when the backend returns no rows", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(listAdminDemands(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "demands" });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 50 });
  });

  it.each([
    ["products", listAdminProducts],
    ["orders", listAdminOrders],
    ["disputes", listAdminDisputes],
  ])("throws backend errors for %s", async (_table, listFn) => {
    const service = new FakeAdminListService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(listFn(service as never)).rejects.toThrow(
      "database unavailable",
    );
  });
});
