import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge", () => {
  it("renders the Chinese label for an order status", () => {
    render(<StatusBadge status="pending_payment" />);

    expect(screen.getByText("待付款")).toBeInTheDocument();
  });
});
