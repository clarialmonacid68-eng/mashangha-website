import { describe, expect, it } from "vitest";

import {
  getWorkspaceDisputeDetail,
  listWorkspaceDisputeEvidence,
} from "@/lib/domain/disputes/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeDisputeQueryService {
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

describe("workspace dispute read services", () => {
  it("gets workspace dispute detail", async () => {
    const service = new FakeDisputeQueryService({
      data: { id: "dispute-1", status: "open" },
      error: null,
    });

    await expect(
      getWorkspaceDisputeDetail(service as never, "dispute-1"),
    ).resolves.toEqual({ id: "dispute-1", status: "open" });

    expect(service.calls).toContainEqual({
      method: "from",
      value: "disputes",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "id, order_id, opened_by, reason, requested_resolution, status, resolution_notes, created_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "id", value: "dispute-1" },
    });
    expect(service.calls).toContainEqual({ method: "single", value: null });
  });

  it("lists workspace dispute evidence oldest first", async () => {
    const service = new FakeDisputeQueryService();

    await expect(
      listWorkspaceDisputeEvidence(service as never, "dispute-1"),
    ).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "dispute_evidence",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "id, storage_path, description, submitted_by, created_at",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "dispute_id", value: "dispute-1" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "created_at", options: { ascending: true } },
    });
  });

  it.each([
    ["detail", getWorkspaceDisputeDetail],
    ["evidence", listWorkspaceDisputeEvidence],
  ])("throws backend errors for dispute %s", async (_name, queryFn) => {
    const service = new FakeDisputeQueryService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(queryFn(service as never, "dispute-1")).rejects.toThrow(
      "database unavailable",
    );
  });
});
