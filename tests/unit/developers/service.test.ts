import { describe, expect, it } from "vitest";

import {
  applyForDeveloperRole,
  getDeveloperOwnProfile,
  getPublicDeveloperDetail,
  listPublicDevelopers,
} from "@/lib/domain/developers/service";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeDeveloperService {
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
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", value: count });
    return Promise.resolve(this.result as QueryResult);
  }

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", value: null });
    return Promise.resolve(this.result as SingleQueryResult);
  }

  rpc(name: string) {
    this.calls.push({ method: "rpc", value: name });
    return Promise.resolve({
      data: null,
      error: this.result.error,
    });
  }
}

describe("developer profile services", () => {
  it("gets the current developer profile for workspace display", async () => {
    const service = new FakeDeveloperService({
      data: { display_name: "Ada", review_status: "approved" },
      error: null,
    });

    await expect(
      getDeveloperOwnProfile(service as never, "developer-1"),
    ).resolves.toEqual({ display_name: "Ada", review_status: "approved" });

    expect(service.calls).toContainEqual({
      method: "from",
      value: "developer_profiles",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value:
        "display_name, city, bio, skills, service_scopes, starting_price_cents, portfolio_title, portfolio_description, portfolio_url, portfolio_image_url, contact, payout_subject_type, payout_subject_name, review_status, rejection_reason",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "user_id", value: "developer-1" },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });

  it("returns null when no developer profile exists", async () => {
    const service = new FakeDeveloperService();

    await expect(
      getDeveloperOwnProfile(service as never, "developer-1"),
    ).resolves.toBeNull();
  });

  it("throws backend errors when loading the developer profile fails", async () => {
    const service = new FakeDeveloperService({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      getDeveloperOwnProfile(service as never, "developer-1"),
    ).rejects.toThrow("database unavailable");
  });

  it("lists approved public developers by latest review", async () => {
    const service = new FakeDeveloperService();

    await expect(listPublicDevelopers(service as never)).resolves.toEqual([]);

    expect(service.calls).toContainEqual({
      method: "from",
      value: "developer_profiles",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "user_id, headline, bio, skills",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "review_status", value: "approved" },
    });
    expect(service.calls).toContainEqual({
      method: "order",
      value: { column: "reviewed_at", options: { ascending: false } },
    });
    expect(service.calls).toContainEqual({ method: "limit", value: 24 });
  });

  it("gets only an approved public developer detail", async () => {
    const service = new FakeDeveloperService({
      data: { headline: "AI Builder", skills: ["Next.js"] },
      error: null,
    });

    await expect(
      getPublicDeveloperDetail(service as never, "developer-1"),
    ).resolves.toEqual({ headline: "AI Builder", skills: ["Next.js"] });

    expect(service.calls).toContainEqual({
      method: "from",
      value: "developer_profiles",
    });
    expect(service.calls).toContainEqual({
      method: "select",
      value: "headline, bio, skills, hourly_rate_cents",
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "user_id", value: "developer-1" },
    });
    expect(service.calls).toContainEqual({
      method: "eq",
      value: { column: "review_status", value: "approved" },
    });
    expect(service.calls).toContainEqual({
      method: "maybeSingle",
      value: null,
    });
  });

  it("applies for the developer role through the domain service", async () => {
    const service = new FakeDeveloperService();

    await expect(applyForDeveloperRole(service as never)).resolves.toBeUndefined();

    expect(service.calls).toContainEqual({
      method: "rpc",
      value: "apply_for_developer",
    });
  });

  it("throws backend errors when applying for the developer role fails", async () => {
    const service = new FakeDeveloperService({
      data: null,
      error: { message: "rpc unavailable" },
    });

    await expect(applyForDeveloperRole(service as never)).rejects.toThrow(
      "rpc unavailable",
    );
  });
});
