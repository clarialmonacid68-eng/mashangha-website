import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { listWorkspaceNotifications } from "@/lib/domain/notifications/queries";
import { createClient } from "@/lib/auth/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await listWorkspaceNotifications(supabase);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">通知中心</p>
        <h1>站内通知</h1>
        <p className="auth-intro">
          平台关键事件会优先生成站内通知；邮件和短信失败不会影响业务事务。
        </p>
      </div>

      {notifications?.length ? (
        <div className="workspace-list">
          {notifications.map((notification) => (
            <Card className="settings-card" key={notification.id}>
              <span className="status-badge">{notification.event_type}</span>
              <h2>{notification.title}</h2>
              {notification.body ? <p>{notification.body}</p> : null}
              <p>{new Date(notification.created_at).toLocaleString("zh-CN")}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>暂无通知</h2>
          <p>当需求、报价、支付、交付、退款、仲裁或分账有进展时会显示在这里。</p>
        </Card>
      )}
    </div>
  );
}
