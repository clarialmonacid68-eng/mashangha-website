import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCustomerDemands } from "@/lib/domain/demands/service";
import { createClient } from "@/lib/auth/server";

const statusLabel: Record<string, string> = {
  draft: "草稿",
  pending_review: "审核中",
  published: "已发布",
  matched: "已匹配",
  closed: "已关闭",
};

export default async function CustomerDemandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const demands = await listCustomerDemands(supabase, user.id);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">客户工作台</p>
        <h1>我的需求</h1>
        <p className="auth-intro">管理你发布的需求，并查看收到的报价。</p>
      </div>

      <Link href="/workspace/customer/demands/new">
        <Button type="button">发布新需求</Button>
      </Link>

      {demands?.length ? (
        <div className="workspace-list">
          {demands.map((demand) => (
            <Card className="settings-card" key={demand.id}>
              <span className="status-badge">
                {statusLabel[demand.status] ?? demand.status}
              </span>
              <h2>{demand.title}</h2>
              <p>{demand.description}</p>
              <Link href={`/workspace/customer/demands/${demand.id}/quotes`}>
                查看收到的报价
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有发布需求</h2>
          <p>点击上方按钮发布你的第一个开发需求。</p>
        </Card>
      )}
    </div>
  );
}
