import type { Metadata } from "next";

import { RulePage } from "@/components/marketing/rule-page";

export const metadata: Metadata = {
  title: "隐私政策 | 码上好",
  description: "码上好收集、使用、保存和保护个人信息的规则。",
  alternates: { canonical: "/rules/privacy" },
};

export default function PrivacyRulesPage() {
  return (
    <RulePage
      description="我们只在提供账号、审核、交易和安全服务所需范围内处理信息。"
      title="隐私政策"
    >
      <h2>收集的信息</h2>
      <p>包括登录邮箱或手机号、账号资料、需求与报价、订单留言、附件元数据以及必要的安全日志。</p>
      <h2>使用目的</h2>
      <p>用于身份验证、内容审核、履约协作、争议处理、通知发送和安全风控。</p>
      <h2>保存与访问</h2>
      <p>私有需求附件、订单文件和争议证据不作为公开内容展示，仅向有权限的参与方和管理人员开放。</p>
      <h2>用户权利</h2>
      <p>用户可申请查询、更正或删除个人资料；依法必须保留的交易和审计记录除外。</p>
    </RulePage>
  );
}

