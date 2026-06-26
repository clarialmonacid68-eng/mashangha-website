import { describe, expect, it } from "vitest";

import {
  reviewDemand,
  reviewProduct,
  setProductSuspension,
} from "@/lib/domain/admin/governance";

type Operation =
  | {
      filters: Record<string, unknown>;
      table: string;
      type: "update";
      values: Record<string, unknown>;
    }
  | {
      table: string;
      type: "insert";
      values: Record<string, unknown>;
    };

class FakeSupabaseService {
  readonly operations: Operation[] = [];

  from(table: string) {
    return {
      insert: (values: Record<string, unknown>) => {
        this.operations.push({ table, type: "insert", values });
        return Promise.resolve({ error: null });
      },
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => {
          this.operations.push({
            filters: { [column]: value },
            table,
            type: "update",
            values,
          });
          return Promise.resolve({ error: null });
        },
      }),
    };
  }
}

function createService() {
  return new FakeSupabaseService();
}

describe("admin governance moderation services", () => {
  it("approves a demand and writes the matching audit action", async () => {
    const service = createService();

    await expect(
      reviewDemand(service as never, {
        adminId: "admin-1",
        decision: "approve",
        demandId: "demand-1",
        note: "Looks good",
      }),
    ).resolves.toEqual({ entityId: "demand-1", ok: true });

    expect(service.operations).toMatchObject([
      {
        filters: { id: "demand-1" },
        table: "demands",
        type: "update",
        values: {
          review_notes: "Looks good",
          status: "published",
        },
      },
      {
        table: "audit_logs",
        type: "insert",
        values: {
          action: "demand.approve",
          actor_id: "admin-1",
          entity_id: "demand-1",
          entity_type: "demand",
          metadata: { note: "Looks good" },
        },
      },
    ]);
    expect(service.operations[0]).toHaveProperty("values.published_at");
  });

  it("rejects a product without publishing it and preserves audit action", async () => {
    const service = createService();

    await expect(
      reviewProduct(service as never, {
        adminId: "admin-1",
        decision: "reject",
        note: "Needs clearer pricing",
        productId: "product-1",
      }),
    ).resolves.toEqual({ entityId: "product-1", ok: true });

    expect(service.operations).toMatchObject([
      {
        filters: { id: "product-1" },
        table: "products",
        type: "update",
        values: {
          published_at: null,
          review_notes: "Needs clearer pricing",
          status: "rejected",
        },
      },
      {
        table: "audit_logs",
        type: "insert",
        values: {
          action: "product.reject",
          entity_id: "product-1",
          entity_type: "product",
          metadata: { note: "Needs clearer pricing" },
        },
      },
    ]);
  });

  it("requires notes before mutating product suspension state", async () => {
    const service = createService();

    await expect(
      setProductSuspension(service as never, {
        adminId: "admin-1",
        note: " ",
        productId: "product-1",
        suspended: true,
      }),
    ).resolves.toEqual({ ok: false, reason: "missing_note" });

    expect(service.operations).toEqual([]);
  });
});
