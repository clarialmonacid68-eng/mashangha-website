import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("mock payment page UI", () => {
  it("offers a confirmation action after creating a mock payment", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "app/(workspace)/workspace/orders/[id]/pay/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("async function confirmPayment");
    expect(source).toContain("确认模拟支付");
    expect(source).toContain("providerPaymentId");
  });
});
