import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitDeveloperApplication } from "@/lib/domain/developers/service";
import { createClient } from "@/lib/auth/server";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : -1;
}

async function submitApplication(formData: FormData) {
  "use server";

  const supabase = await createClient();

  try {
    await submitDeveloperApplication(supabase, {
      displayName: String(formData.get("displayName") ?? ""),
      city: String(formData.get("city") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      skills: splitList(formData.get("skills")),
      serviceScopes: splitList(formData.get("serviceScopes")),
      startingPriceCents: parseMoneyToCents(formData.get("startingPrice")),
      portfolio: {
        title: String(formData.get("portfolioTitle") ?? ""),
        description: String(formData.get("portfolioDescription") ?? ""),
        url: String(formData.get("portfolioUrl") ?? ""),
        imageUrl: String(formData.get("portfolioImageUrl") ?? ""),
      },
      contact: String(formData.get("contact") ?? ""),
      payoutSubjectType:
        formData.get("payoutSubjectType") === "company"
          ? "company"
          : "individual",
      payoutSubjectName: String(formData.get("payoutSubjectName") ?? ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "提交开发者认证失败";
    redirect(
      `/workspace/developer/apply?error=${encodeURIComponent(message)}`,
    );
  }

  redirect("/workspace/developer/profile?submitted=1");
}

export default async function DeveloperApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">开发者认证</p>
        <h1>提交开发者资料</h1>
        <p className="auth-intro">
          资料提交后进入待审核状态，审核通过前不会出现在公开开发者市场。
        </p>
      </div>

      <Card className="settings-card">
        {params.error ? (
          <p className="auth-message">{decodeURIComponent(params.error)}</p>
        ) : null}

        <form action={submitApplication} className="auth-form demand-form">
          <label htmlFor="displayName">姓名或品牌名</label>
          <input id="displayName" name="displayName" required />

          <label htmlFor="city">城市</label>
          <input id="city" name="city" required />

          <label htmlFor="bio">简介</label>
          <textarea
            id="bio"
            name="bio"
            placeholder="说明你的服务方向、经验和适合承接的项目。"
            required
            rows={5}
          />

          <label htmlFor="skills">技能</label>
          <textarea
            id="skills"
            name="skills"
            placeholder="每行或用逗号分隔，例如：AI 应用、Next.js、小程序"
            required
            rows={3}
          />

          <label htmlFor="serviceScopes">服务范围</label>
          <textarea
            id="serviceScopes"
            name="serviceScopes"
            placeholder="每行或用逗号分隔，例如：需求梳理、原型开发、上线部署"
            required
            rows={3}
          />

          <label htmlFor="startingPrice">起步价（元）</label>
          <input
            id="startingPrice"
            min={0}
            name="startingPrice"
            required
            type="number"
          />

          <label htmlFor="portfolioTitle">作品标题</label>
          <input id="portfolioTitle" name="portfolioTitle" required />

          <label htmlFor="portfolioDescription">作品说明</label>
          <textarea
            id="portfolioDescription"
            name="portfolioDescription"
            required
            rows={4}
          />

          <label htmlFor="portfolioUrl">作品链接</label>
          <input id="portfolioUrl" name="portfolioUrl" required type="url" />

          <label htmlFor="portfolioImageUrl">作品图片链接</label>
          <input
            id="portfolioImageUrl"
            name="portfolioImageUrl"
            required
            type="url"
          />

          <label htmlFor="contact">联系方式</label>
          <input id="contact" name="contact" required />

          <label htmlFor="payoutSubjectType">收款主体类型</label>
          <select id="payoutSubjectType" name="payoutSubjectType">
            <option value="individual">个人</option>
            <option value="company">企业</option>
          </select>

          <label htmlFor="payoutSubjectName">收款主体名称</label>
          <input id="payoutSubjectName" name="payoutSubjectName" required />

          <Button type="submit">提交审核</Button>
        </form>
      </Card>
    </div>
  );
}
