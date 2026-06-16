import type { Metadata } from "next";

import { RulePage } from "@/components/marketing/rule-page";

export const metadata: Metadata = {
  title: "服务协议 | 码上好",
  description: "码上好平台账号、内容、服务边界和用户责任说明。",
  alternates: { canonical: "/rules/service" },
};

export default function ServiceRulesPage() {
  return (
    <RulePage
      description="使用平台前，请了解账号、内容与服务能力的基本约定。"
      title="服务协议"
    >
      <h2>平台角色</h2>
      <p>客户发布真实开发需求，开发者提交方案和报价，平台提供信息展示、审核和订单过程记录。</p>
      <h2>账号责任</h2>
      <p>用户应提供真实、合法的信息并妥善保管登录凭证，不得冒用他人身份或发布违法内容。</p>
      <h2>当前服务边界</h2>
      <p>支付产品正式开通前，平台不开放真实付款，也不承诺代管资金或无条件退款。</p>
      <h2>内容处理</h2>
      <p>平台可对违法、侵权、虚假或明显无法履行的内容拒绝发布、暂停展示或保留证据。</p>
    </RulePage>
  );
}

