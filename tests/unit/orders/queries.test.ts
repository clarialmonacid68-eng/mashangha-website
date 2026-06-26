import { describe, expect, it } from "vitest";

import {
  getOrderForParticipant,
  getOrderReviewByAuthor,
  listOrderAttachments,
  listOrderDeliveries,
  listOrderMessages,
  listParticipantOrders,
} from "@/lib/domain/orders/queries";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeOrderQueryService {
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
    return Promise.resolve(this.result);
  }

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", value: null });
    return Promise.resolve(this.result);
  }
}

describe("order detail read queries", () => {
  it("lists participant orders newest first with demand titles", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(listParticipantOrders(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "orders" });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, amount_cents, status, customer_id, developer_id, created_at, demands(title)",
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
  });

  it("returns null when the participant order is not visible", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(
      getOrderForParticipant(service as never, "order-1"),
    ).resolves.toBeNull();

    expect(service.calls).toContainEqual({ method: "from", value: "orders" });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "id", value: "order-1" },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });

  it("lists order messages oldest first", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(listOrderMessages(service as never, "order-1")).resolves.toEqual(
      [],
    );

    expect(service.calls).toContainEqual({
      method: "from",
      value: "order_messages",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "order_id", value: "order-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: true } },
    });
  });

  it("lists order attachments oldest first", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(
      listOrderAttachments(service as never, "order-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "order_attachments",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "order_id", value: "order-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: true } },
    });
  });

  it("lists order deliveries newest version first", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(
      listOrderDeliveries(service as never, "order-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "deliveries",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "order_id", value: "order-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "version", options: { ascending: false } },
    });
  });

  it("gets the current author's order review", async () => {
    const service = new FakeOrderQueryService({ data: null, error: null });

    await expect(
      getOrderReviewByAuthor(service as never, "order-1", "user-1"),
    ).resolves.toBeNull();

    expect(service.calls).toContainEqual({ method: "from", value: "reviews" });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "order_id", value: "order-1" },
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "author_id", value: "user-1" },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });

  it.each([
    ["order", getOrderForParticipant],
    ["review", getOrderReviewByAuthor],
  ])("throws backend errors for %s single-row query", async (_name, queryFn) => {
    const service = new FakeOrderQueryService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(queryFn(service as never, "order-1", "user-1")).rejects.toThrow(
      "database unavailable",
    );
  });

  it.each([
    ["participant orders", listParticipantOrders],
    ["messages", listOrderMessages],
    ["attachments", listOrderAttachments],
    ["deliveries", listOrderDeliveries],
  ])("throws backend errors for %s list query", async (_name, queryFn) => {
    const service = new FakeOrderQueryService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(queryFn(service as never, "order-1")).rejects.toThrow(
      "database unavailable",
    );
  });
});
