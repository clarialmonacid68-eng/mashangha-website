import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "定制数字员工 | 码上好",
  description:
    "描述你想要的数字员工岗位，由码上好认证开发者为你定制实现 AI 客服、销售助理、数据处理等数字化能力。",
  alternates: { canonical: "/digital-employees" },
};

type Role = {
  key: string;
  name: string;
  summary: string;
  tasks: string[];
};

// 每个岗位都通过现有「发布需求 → 开发者报价 → 下单 → 交付验收」流程定制实现，
// 并预填项目类型为「数字员工定制」。
const roles: Role[] = [
  {
    key: "ai-service",
    name: "AI 客服员工",
    summary: "7×24 接待咨询、回答产品问题、收集线索并转交人工。",
    tasks: ["常见问题自动应答", "产品知识库问答", "留资与工单转交"],
  },
  {
    key: "sales-assistant",
    name: "AI 销售助理",
    summary: "跟进意向客户、整理沟通记录、生成跟进提醒。",
    tasks: ["线索分级整理", "对话要点归纳", "跟进任务生成"],
  },
  {
    key: "ops-assistant",
    name: "AI 运营助手",
    summary: "按模板生成内容初稿、汇总数据、产出日报周报。",
    tasks: ["内容初稿撰写", "数据汇总", "周期报告生成"],
  },
  {
    key: "data-entry",
    name: "AI 数据处理员",
    summary: "从单据、表格、邮件中抽取结构化数据并入库。",
    tasks: ["票据/表单识别", "字段抽取与校验", "结构化数据导出"],
  },
];

export default function DigitalEmployeesPage() {
  return (
    <main className="marketing-page">
      <header className="marketplace-heading">
        <span className="eyebrow">定制数字员工</span>
        <h1>把重复工作，交给定制的数字员工</h1>
        <p>
          描述你想要的岗位，由码上好认证开发者按你的业务定制实现。每个数字员工都通过平台的需求审核、报价、下单和交付验收流程落地。
        </p>
        <p className="panel-note">
          数字员工由认证开发者定制开发，不是开箱即用的通用产品；具体能力、范围和效果以双方在订单内确认的方案为准。平台真实支付能力上线前，仅开放需求登记与模拟订单流程。
        </p>
      </header>

      <section className="marketplace-grid">
        {roles.map((role) => (
          <Card className="marketplace-card" key={role.key}>
            <span className="status-badge">可定制</span>
            <h2>{role.name}</h2>
            <p>{role.summary}</p>
            <ul>
              {role.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
            <Button
              href={`/workspace/customer/demands/new?type=digital_employee&title=${encodeURIComponent(
                `定制${role.name}`,
              )}`}
            >
              定制这个数字员工
            </Button>
          </Card>
        ))}
      </section>

      <section className="content-section audience-section">
        <Card className="audience-card audience-card-customer">
          <span className="eyebrow">没有合适的岗位？</span>
          <h2>描述你的场景，我们帮你匹配开发者</h2>
          <p>把你想自动化的工作写清楚，提交需求后由认证开发者给出定制方案与报价。</p>
          <Button href="/workspace/customer/demands/new?type=digital_employee">
            定制我的数字员工
          </Button>
        </Card>
        <Card className="audience-card audience-card-developer">
          <span className="eyebrow">我是开发者</span>
          <h2>承接数字员工定制需求</h2>
          <p>完善认证资料后，在「可报价需求」里筛选数字员工类目并提交方案。</p>
          <Button href="/workspace/settings" variant="secondary">
            申请开发者认证
          </Button>
        </Card>
      </section>

      <p className="panel-note">
        想先看看其他需求？<Link href="/demands">浏览需求市场</Link>
      </p>
    </main>
  );
}
