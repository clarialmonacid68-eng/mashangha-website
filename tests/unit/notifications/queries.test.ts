import { describe, expect, it } from "vitest";

import { listWorkspaceNotifications } from "@/lib/domain/notifications/queries";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeNotificationQueryService {
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

  order(column: string, options: { ascending: boolean }) {
    this.calls.push({ method: "order", value: { column, options } });
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", value: count });
    return Promise.resolve(this.result);
  }
}

describe("workspace notification queries", () => {
  it("lists workspace notifications newest first with page columns", async () => {
    const service = new FakeNotificationQueryService();

    await expect(listWorkspaceNotifications(service as never)).resolves.toEqual(
      [],
    );

    expect(service.calls).toContainEqual({
      method: "from",
      value: "notifications",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "id, title, body, event_type, read_at, created_at",
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 50 });
  });

  it("throws backend errors when listing workspace notifications fails", async () => {
    const service = new FakeNotificationQueryService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(listWorkspaceNotifications(service as never)).rejects.toThrow(
      "database unavailable",
    );
  });
});
