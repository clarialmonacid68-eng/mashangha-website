import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/security/audit";

const adminLinks = [
  ["/admin/developers", "开发者审核"],
  ["/admin/demands", "需求审核"],
  ["/admin/orders", "订单中心"],
  ["/admin/disputes", "争议中心"],
  ["/admin/risk", "风控基础"],
  ["/admin/audit", "审计日志"],
] as const;

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="workspace-page application-shell-admin">
      <div>
        <p className="eyebrow">运营后台</p>
        <h1>运营后台</h1>
        <p className="auth-intro">
          处理审核、订单、争议、风控和审计事项。高风险操作需要填写原因。
        </p>
      </div>

      <div className="workspace-list">
        {adminLinks.map(([href, label]) => (
          <Card className="settings-card" key={href}>
            <h2>{label}</h2>
            <Button href={href} variant="secondary">
              进入
            </Button>
          </Card>
        ))}
      </div>
    </main>
  );
}
