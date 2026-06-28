import { beforeEach, describe, expect, it, vi } from "vitest";

const createQuoteMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/domain/quotes/service", () => ({
  createQuote: createQuoteMock,
}));

import { createQuoteFromForm } from "@/lib/domain/quotes/form";

describe("createQuoteFromForm", () => {
  beforeEach(() => {
    createQuoteMock.mockReset();
    createQuoteMock.mockResolvedValue({ id: "quote-1" });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T00:00:00.000Z"));
  });

  it("converts yuan to cents and valid days to an absolute expiry", async () => {
    await createQuoteFromForm({} as never, "demand-1", {
      amountYuan: "12.345",
      deliveryDays: "7",
      proposal: "I can ship this.",
      validDays: "3",
    });

    expect(createQuoteMock).toHaveBeenCalledWith({} as never, "demand-1", {
      amountCents: 1235,
      deliveryDays: 7,
      expiresAt: "2026-06-29T00:00:00.000Z",
      proposal: "I can ship this.",
    });
  });

  it("keeps quote validity at a minimum of one day", async () => {
    await createQuoteFromForm({} as never, "demand-1", {
      amountYuan: "1",
      deliveryDays: "2",
      proposal: "Minimum validity.",
      validDays: "0",
    });

    expect(createQuoteMock).toHaveBeenCalledWith(
      expect.anything(),
      "demand-1",
      expect.objectContaining({
        expiresAt: "2026-06-27T00:00:00.000Z",
      }),
    );
  });
});
