import { describe, expect, it } from "vitest";

import { transition } from "@/lib/domain/orders/state-machine";

describe("order state machine", () => {
  it("moves paid orders into fulfillment", () => {
    expect(transition("pending_payment", "payment_succeeded")).toBe(
      "in_progress",
    );
  });

  it("rejects events that are not valid for the current state", () => {
    expect(() => transition("completed", "deliver")).toThrow(
      "Invalid order transition",
    );
  });

  it("covers refund and profit-share recovery transitions", () => {
    expect(transition("disputed", "approve_refund")).toBe("refund_review");
    expect(transition("refunding", "refund_failed")).toBe("refund_review");
    expect(transition("sharing", "profit_share_failed")).toBe("share_failed");
    expect(transition("share_failed", "retry_profit_share")).toBe("sharing");
  });
});
