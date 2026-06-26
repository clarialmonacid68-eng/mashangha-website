import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/digital-employees", label: "数字员工" },
  { href: "/products", label: "AI 应用市场" },
  { href: "/demands", label: "需求市场" },
  { href: "/developers", label: "开发者市场" },
  { href: "/workspace/settings", label: "开发者入驻" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link aria-label="码上好" className="brand" href="/">
          <span className="brand-mark">码</span>
          <span>码上好</span>
        </Link>

        <nav aria-label="主导航" className="site-navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Button href="/login" variant="ghost">
            登录
          </Button>
          <Button href="/workspace/customer/demands/new">发布需求</Button>
        </div>

        <details className="mobile-navigation">
          <summary>菜单</summary>
          <nav aria-label="移动端导航">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/rules/trading">交易规则</Link>
            <Link href="/login">登录</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
