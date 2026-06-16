import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  cooperationModes,
  demandProjectTypes,
  type DemandInput,
} from "@/lib/domain/demands/schema";
import {
  createDemandDraft,
  submitDemandForReview,
} from "@/lib/domain/demands/service";
import { createClient } from "@/lib/auth/server";

function parseBudget(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

function parseProjectType(
  value: FormDataEntryValue | null,
): DemandInput["projectType"] | null {
  return demandProjectTypes.includes(
    value as (typeof demandProjectTypes)[number],
  )
    ? (value as DemandInput["projectType"])
    : null;
}

function parseCooperationMode(
  value: FormDataEntryValue | null,
): DemandInput["cooperationMode"] | null {
  return cooperationModes.includes(value as (typeof cooperationModes)[number])
    ? (value as DemandInput["cooperationMode"])
    : null;
}

function parseAttachment(formData: FormData) {
  const storagePath = String(formData.get("attachmentPath") ?? "").trim();
  const fileName = String(formData.get("attachmentName") ?? "").trim();

  if (!storagePath || !fileName) {
    return [];
  }

  return [
    {
      contentType: null,
      fileName,
      sizeBytes: 0,
      storagePath,
    },
  ];
}

async function createDraftDemand(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const projectType = parseProjectType(formData.get("projectType"));
  const description = String(formData.get("description") ?? "").trim();
  const budgetMinCents = parseBudget(formData.get("budgetMin"));
  const budgetMaxCents = parseBudget(formData.get("budgetMax"));
  const expectedDeliveryDays = parsePositiveInteger(
    formData.get("expectedDeliveryDays"),
  );
  const cooperationMode = parseCooperationMode(formData.get("cooperationMode"));

  if (
    title.length < 4 ||
    description.length < 20 ||
    budgetMinCents === null ||
    budgetMaxCents === null ||
    budgetMaxCents < budgetMinCents ||
    expectedDeliveryDays === null ||
    projectType === null ||
    cooperationMode === null
  ) {
    redirect("/workspace/customer/demands/new?error=invalid");
  }

  try {
    const demand = await createDemandDraft(supabase, {
      attachments: parseAttachment(formData),
      budgetMaxCents,
      budgetMinCents,
      cooperationMode,
      description,
      expectedDeliveryDays,
      projectType,
      title,
    });
    await submitDemandForReview(supabase, demand.id);
  } catch {
    redirect("/workspace/customer/demands/new?error=create_failed");
  }

  redirect("/workspace/customer/demands/new?submitted=1");
}

export default async function NewDemandPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; submitted?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">客户工作台</p>
        <h1>发布开发需求</h1>
        <p className="auth-intro">
          先保存为草稿，后续审核流程完成后再进入公开需求市场。
        </p>
      </div>

      <Card className="settings-card">
        {params.saved || params.submitted ? (
          <p className="auth-message">
            {params.submitted ? "需求已提交审核。" : "需求草稿已保存。"}
          </p>
        ) : null}
        {params.error === "invalid" ? (
          <p className="auth-message">
            请填写完整需求，并确认预算上限不低于预算下限。
          </p>
        ) : null}
        {params.error === "create_failed" ? (
          <p className="auth-message">保存失败，请稍后重试。</p>
        ) : null}

        <form action={createDraftDemand} className="auth-form demand-form">
          <label htmlFor="title">需求标题</label>
          <input
            id="title"
            maxLength={120}
            minLength={4}
            name="title"
            placeholder="例如：企业官网接入 AI 客服"
            required
          />

          <label htmlFor="projectType">项目类型</label>
          <select id="projectType" name="projectType" required>
            <option value="ai_app">AI 应用</option>
            <option value="mini_program">小程序</option>
            <option value="website">网站建设</option>
            <option value="automation">自动化工具</option>
            <option value="other">其他</option>
          </select>

          <label htmlFor="description">需求描述</label>
          <textarea
            id="description"
            minLength={20}
            name="description"
            placeholder="说明业务背景、核心功能、参考链接、交付物和验收标准。"
            required
            rows={6}
          />

          <div className="form-grid">
            <div>
              <label htmlFor="budgetMin">预算下限（元）</label>
              <input
                id="budgetMin"
                min={0}
                name="budgetMin"
                required
                type="number"
              />
            </div>
            <div>
              <label htmlFor="budgetMax">预算上限（元）</label>
              <input
                id="budgetMax"
                min={0}
                name="budgetMax"
                required
                type="number"
              />
            </div>
          </div>

          <label htmlFor="expectedDeliveryDays">期望周期（天）</label>
          <input
            id="expectedDeliveryDays"
            min={1}
            name="expectedDeliveryDays"
            required
            type="number"
          />

          <label htmlFor="cooperationMode">合作方式</label>
          <select id="cooperationMode" name="cooperationMode" required>
            <option value="fixed_scope">固定范围报价</option>
            <option value="hourly">按小时协作</option>
            <option value="consulting">咨询顾问</option>
          </select>

          <label htmlFor="attachmentName">附件名称</label>
          <input
            id="attachmentName"
            name="attachmentName"
            placeholder="例如：需求说明.pdf"
          />

          <label htmlFor="attachmentPath">附件路径</label>
          <input
            id="attachmentPath"
            name="attachmentPath"
            placeholder="上传接入前可填写对象存储路径"
          />

          <Button type="submit">提交需求审核</Button>
        </form>
      </Card>
    </div>
  );
}
