import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "开发者市场 | 码上好",
  description: "浏览通过平台认证的 AI 应用与软件开发服务者。",
  alternates: { canonical: "/developers" },
};

export default async function DevelopersPage() {
  const supabase = await createClient();
  const { data: developers } = await supabase
    .from("developer_profiles")
    .select("user_id, headline, bio, skills")
    .eq("review_status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(24);

  return (
    <main className="marketing-page">
      <header className="marketplace-heading">
        <span className="eyebrow">认证服务者</span>
        <h1>开发者市场</h1>
        <p>公开资料只展示已完成审核的开发者，不展示未验证评分或成交量。</p>
      </header>

      {developers?.length ? (
        <div className="marketplace-grid">
          {developers.map((developer) => (
            <Link href={`/developers/${developer.user_id}`} key={developer.user_id}>
              <Card className="marketplace-card">
                <span className="status-badge status-badge-completed">已认证</span>
                <h2>{developer.headline || "AI 开发服务者"}</h2>
                <p>{developer.bio || "开发者正在完善公开介绍。"}</p>
                <div className="skill-list">
                  {developer.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="empty-state">
          <h2>认证开发者正在入驻</h2>
          <p>审核通过后才会展示公开资料，不使用虚构开发者填充列表。</p>
          <Link href="/workspace/settings">申请开发者认证</Link>
        </Card>
      )}
    </main>
  );
}

