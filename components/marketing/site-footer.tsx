import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <div className="site-footer-brand">码上好</div>
        <p>连接真实需求与可靠的 AI 开发者。</p>
      </div>
      <nav aria-label="页脚导航">
        <Link href="/rules/service">服务协议</Link>
        <Link href="/rules/privacy">隐私政策</Link>
        <Link href="/rules/trading">交易规则</Link>
        <Link href="/rules/disputes">争议规则</Link>
      </nav>
      <p className="site-footer-copy">© 2026 码上好 · mshcode.com</p>
    </footer>
  );
}
