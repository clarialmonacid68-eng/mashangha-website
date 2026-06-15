import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/demands", label: "需求市场" },
  { href: "/developers", label: "开发者市场" },
  { href: "/#how-it-works", label: "如何运作" },
  { href: "/developer/apply", label: "开发者入驻" },
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
          <Button href="/demands/new">发布需求</Button>
        </div>
      </div>
    </header>
  );
}
