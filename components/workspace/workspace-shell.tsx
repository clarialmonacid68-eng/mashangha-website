import Link from "next/link";
import type { ReactNode } from "react";

type WorkspaceRole = "customer" | "developer";

const roleConfig = {
  customer: {
    label: "客户工作台",
    links: [
      { href: "/workspace/customer", label: "概览" },
      { href: "/workspace/customer/demands", label: "我的需求" },
      { href: "/workspace/customer/quotes", label: "收到的报价" },
      { href: "/workspace/orders", label: "我的订单" },
      { href: "/workspace/settings", label: "账号设置" },
    ],
  },
  developer: {
    label: "开发者工作台",
    links: [
      { href: "/workspace/developer", label: "概览" },
      { href: "/workspace/developer/profile", label: "认证资料" },
      { href: "/workspace/developer/demands", label: "可报价需求" },
      { href: "/workspace/developer/quotes", label: "我的报价" },
      { href: "/workspace/orders", label: "履约订单" },
      { href: "/workspace/settings", label: "账号设置" },
    ],
  },
} satisfies Record<
  WorkspaceRole,
  { label: string; links: { href: string; label: string }[] }
>;

export function WorkspaceShell({
  children,
  role,
}: {
  children: ReactNode;
  role: WorkspaceRole;
}) {
  const config = roleConfig[role];

  return (
    <div className="application-shell">
      <aside className="application-sidebar">
        <Link className="brand application-brand" href="/">
          <span className="brand-mark">码</span>
          <span>码上好</span>
        </Link>
        <p className="application-label">{config.label}</p>
        <nav aria-label={config.label}>
          {config.links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="application-content">{children}</main>
    </div>
  );
}
