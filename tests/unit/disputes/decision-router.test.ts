import { describe, expect, it } from "vitest";

import { resolveDisputeByDecision } from "@/lib/domain/disputes/service";

class ThrowingSupabaseClient {
  from() {
    throw new Error("database should not be touched for invalid dispute decisions");
  }
}

describe("resolveDisputeByDecision", () => {
  it("rejects invalid decisions before touching the database", async () => {
    await expect(
      resolveDisputeByDecision(new ThrowingSupabaseClient() as never, {
        adminId: "admin-1",
        decision: "invalid",
        disputeId: "dispute-1",
        notes: "Needs a decision",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects blank notes before touching the database", async () => {
    await expect(
      resolveDisputeByDecision(new ThrowingSupabaseClient() as never, {
        adminId: "admin-1",
        decision: "continue",
        disputeId: "dispute-1",
        notes: " ",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  });
});
