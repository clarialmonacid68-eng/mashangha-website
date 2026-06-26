import { describe, expect, it } from "vitest";

import {
  listAbnormalPayments,
  listAdminAuditLogs,
  listAdminDemands,
  listAdminDevelopers,
  listAdminDisputes,
  listAdminOrders,
  listAdminProducts,
  listDeveloperReviewAuditLogs,
  listSuspendedProfiles,
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

  eq(column: string, value: unknown) {
    this.calls.push({ method: "eq", value: { column, value } });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.calls.push({ method: "in", value: { column, values } });
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

  it("lists audit logs with the audit page ordering and limit", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(listAdminAuditLogs(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "audit_logs",
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 100 });
  });

  it("lists only suspended profiles for risk review", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(listSuspendedProfiles(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "profiles" });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "is_suspended", value: true },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 20 });
  });

  it("lists failed and closed payments for risk review", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(listAbnormalPayments(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({ method: "from", value: "payments" });
    expect(service.calls).toContainEqual({
      method: "in",
      value: { column: "status", values: ["failed", "closed"] },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 20 });
  });

  it("lists developer review profiles by most recent update", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(listAdminDevelopers(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "developer_profiles",
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "updated_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 50 });
  });

  it("lists developer review audit logs for note context", async () => {
    const service = new FakeAdminListService({ data: null, error: null });

    await expect(
      listDeveloperReviewAuditLogs(service as never),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "audit_logs",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "entity_type", value: "developer_profile" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 100 });
  });

  it.each([
    ["products", listAdminProducts],
    ["orders", listAdminOrders],
    ["disputes", listAdminDisputes],
    ["audit logs", listAdminAuditLogs],
    ["suspended profiles", listSuspendedProfiles],
    ["abnormal payments", listAbnormalPayments],
    ["developers", listAdminDevelopers],
    ["developer review audit logs", listDeveloperReviewAuditLogs],
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
