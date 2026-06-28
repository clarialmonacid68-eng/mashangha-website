import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getDeveloperOwnProfile } from "@/lib/domain/developers/service";
import { createClient } from "@/lib/auth/server";

const statusCopy = {
  approved: "已通过",
  draft: "待提交资料",
  pending: "审核中",
  rejected: "未通过",
};

export default async function DeveloperProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getDeveloperOwnProfile(supabase, user.id);

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">开发者资料</p>
        <h1>认证资料</h1>
        <p className="auth-intro">
          公开开发者市场只展示审核通过的资料，待审核和未通过资料仅自己可见。
        </p>
      </div>

      <Card className="settings-card">
        {params.submitted ? (
          <p className="auth-message">资料已提交，等待平台审核。</p>
        ) : null}

        {!profile ? (
          <>
            <h2>还没有提交认证资料</h2>
            <p>完善资料后，平台会审核你的服务方向和作品信息。</p>
            <Link href="/workspace/developer/apply">提交开发者资料</Link>
          </>
        ) : (
          <div className="profile-summary">
            <p className="application-label">审核状态</p>
            <strong>{statusCopy[profile.review_status]}</strong>
            {profile.rejection_reason ? (
              <p className="auth-message">拒绝原因：{profile.rejection_reason}</p>
            ) : null}

            <h2>{profile.display_name ?? "未填写名称"}</h2>
            <p>{profile.city}</p>
            <p>{profile.bio}</p>

            <div className="skill-list">
              {profile.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>

            <p>
              服务范围：
              {profile.service_scopes.join("、") || "未填写"}
            </p>
            <p>
              起步价：
              {profile.starting_price_cents
                ? `¥${Math.round(profile.starting_price_cents / 100)}`
                : "未填写"}
            </p>

            <h3>{profile.portfolio_title}</h3>
            <p>{profile.portfolio_description}</p>
            {profile.portfolio_url ? (
              <Link href={profile.portfolio_url}>查看作品链接</Link>
            ) : null}

            <p>联系方式：{profile.contact}</p>
            <p>
              收款主体：
              {profile.payout_subject_type === "company" ? "企业" : "个人"} /{" "}
              {profile.payout_subject_name}
            </p>

            {profile.review_status !== "approved" ? (
              <Link href="/workspace/developer/apply">修改并重新提交</Link>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
