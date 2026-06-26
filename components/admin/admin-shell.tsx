import Link from "next/link";
import type { ReactNode } from "react";

const adminLinks = [
  { href: "/admin", label: "数据概览" },
  { href: "/admin/reviews", label: "审核中心" },
  { href: "/admin/products", label: "应用市场" },
  { href: "/admin/orders", label: "订单管理" },
  { href: "/admin/disputes", label: "仲裁管理" },
  { href: "/admin/audit", label: "操作日志" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="application-shell application-shell-admin">
      <aside className="application-sidebar">
        <Link className="brand application-brand" href="/">
          <span className="brand-mark">码</span>
          <span>码上好</span>
        </Link>
        <p className="application-label">运营后台</p>
        <nav aria-label="运营后台">
          {adminLinks.map((link) => (
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
