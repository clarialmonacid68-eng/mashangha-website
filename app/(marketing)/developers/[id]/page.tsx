import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getPublicDeveloperDetail } from "@/lib/domain/developers/service";
import { createClient } from "@/lib/auth/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "开发者资料 | 码上好",
    description: "查看经过平台审核的开发者公开资料与技能方向。",
    alternates: { canonical: `/developers/${id}` },
  };
}

export default async function DeveloperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const developer = await getPublicDeveloperDetail(supabase, id);

  if (!developer) {
    notFound();
  }

  return (
    <main className="marketing-page">
      <Card className="profile-card">
        <span className="status-badge status-badge-completed">已认证</span>
        <h1>{developer.headline || "AI 开发服务者"}</h1>
        <p>{developer.bio || "开发者正在完善公开介绍。"}</p>
        <div className="skill-list">
          {developer.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        {developer.hourly_rate_cents ? (
          <p className="profile-note">参考服务价格由具体需求和正式报价确定。</p>
        ) : null}
      </Card>
    </main>
  );
}
