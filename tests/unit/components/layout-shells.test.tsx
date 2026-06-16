import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/marketing/site-header";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

describe("application shells", () => {
  it("renders the public marketplace navigation", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "码上好" })).toHaveAttribute(
      "href",
      "/",
    );
    const mainNavigation = screen.getByLabelText("主导航");
    expect(
      within(mainNavigation).getByRole("link", { name: "需求市场" }),
    ).toBeInTheDocument();
    expect(
      within(mainNavigation).getByRole("link", { name: "开发者市场" }),
    ).toBeInTheDocument();
  });

  it("renders customer workspace navigation", () => {
    render(<WorkspaceShell role="customer">内容</WorkspaceShell>);

    expect(screen.getByText("客户工作台")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "我的需求" })).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  it("renders admin navigation", () => {
    render(<AdminShell>后台内容</AdminShell>);

    expect(screen.getByText("运营后台")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "审核中心" })).toBeInTheDocument();
    expect(screen.getByText("后台内容")).toBeInTheDocument();
  });
});
