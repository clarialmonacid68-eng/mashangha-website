import { describe, expect, it } from "vitest";

import {
  getDeveloperReviewStatus,
  listCurrentUserRoles,
} from "@/lib/domain/settings/queries";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeSettingsQueryService {
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

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", value: null });
    return Promise.resolve(this.result);
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

describe("workspace settings queries", () => {
  it("lists current user roles", async () => {
    const service = new FakeSettingsQueryService({
      data: [{ role: "customer" }, { role: "developer" }],
      error: null,
    });

    await expect(
      listCurrentUserRoles(service as never, "user-1"),
    ).resolves.toEqual(["customer", "developer"]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "user_roles",
    });
    expect(service.calls).toContainEqual({ method: "select", value: "role" });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "user_id", value: "user-1" },
    });
  });

  it("returns an empty role list when no rows are visible", async () => {
    const service = new FakeSettingsQueryService({ data: null, error: null });

    await expect(
      listCurrentUserRoles(service as never, "user-1"),
    ).resolves.toEqual([]);
  });

  it("gets the developer review status for the current user", async () => {
    const service = new FakeSettingsQueryService({
      data: { review_status: "pending" },
      error: null,
    });

    await expect(
      getDeveloperReviewStatus(service as never, "user-1"),
    ).resolves.toEqual({ review_status: "pending" });

    expect(service.calls).toContainEqual({
      method: "from",
      value: "developer_profiles",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "review_status",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "user_id", value: "user-1" },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });

  it.each([
    ["roles", listCurrentUserRoles],
    ["developer review status", getDeveloperReviewStatus],
  ])("throws backend errors for %s", async (_name, queryFn) => {
    const service = new FakeSettingsQueryService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(queryFn(service as never, "user-1")).rejects.toThrow(
      "database unavailable",
    );
  });
});
