import { describe, expect, it } from "vitest";

import {
  listDeveloperQuotes,
  listQuotesForCustomerDemand,
} from "@/lib/domain/quotes/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeQuoteService {
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

describe("customer quote services", () => {
  it("lists quotes for a customer demand by lowest amount first", async () => {
    const service = new FakeQuoteService();

    await expect(
      listQuotesForCustomerDemand(service as never, "demand-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "quotes" });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "id, amount_cents, delivery_days, proposal, status, developer_id",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "demand_id", value: "demand-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "amount_cents", options: { ascending: true } },
    });
  });

  it("throws backend errors when listing demand quotes fails", async () => {
    const service = new FakeQuoteService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      listQuotesForCustomerDemand(service as never, "demand-1"),
    ).rejects.toThrow("database unavailable");
  });

  it("lists developer quotes newest first with demand titles", async () => {
    const service = new FakeQuoteService();

    await expect(
      listDeveloperQuotes(service as never, "developer-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "quotes" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, amount_cents, delivery_days, proposal, status, expires_at, demands(title)",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "developer_id", value: "developer-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
  });

  it("normalizes developer quote demand title joins to a single object", async () => {
    const service = new FakeQuoteService({
      data: [
        {
          demands: [{ title: "Build an app" }],
          id: "quote-1",
        },
      ],
      error: null,
    });

    await expect(
      listDeveloperQuotes(service as never, "developer-1"),
    ).resolves.toEqual([
      {
        demands: { title: "Build an app" },
        id: "quote-1",
      },
    ]);
  });
});
