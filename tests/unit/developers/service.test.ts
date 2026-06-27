import { describe, expect, it } from "vitest";

import { getDeveloperOwnProfile } from "@/lib/domain/developers/service";

type SingleQueryResult = {
  data: unknown | null;
  error: { message: string } | null;
};

class FakeDeveloperService {
  readonly calls: Array<{ method: string; value: unknown }> = [];

  constructor(
    private readonly result: SingleQueryResult = { data: null, error: null },
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
});
