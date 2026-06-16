import type { Metadata } from "next";

import { RulePage } from "@/components/marketing/rule-page";

export const metadata: Metadata = {
  title: "交易规则 | 码上好",
  description: "码上好需求审核、报价、全额付款、交付验收和结算规则。",
  alternates: { canonical: "/rules/trading" },
};

export default function TradingRulesPage() {
  return (
    <RulePage
      description="首版采用单一主订单、一次性全额付款和一次正式验收。"
      title="交易规则"
    >
      <h2>需求与报价</h2>
      <p>需求通过审核后公开。客户选择一份有效报价后生成订单，需求停止接受新的有效报价。</p>
      <h2>付款</h2>
      <p>支付能力上线后，客户按订单固化金额一次性付款。平台不会要求用户线下转账至个人账户。</p>
      <h2>履约与交付</h2>
      <p>双方应在订单内保留关键沟通和文件。新增范围通过补充订单处理，不直接修改已付款主订单金额。</p>
      <h2>验收与结算</h2>
      <p>客户根据约定成果验收。开发者结算与平台佣金以支付渠道实际能力和正式签约规则为准。</p>
    </RulePage>
  );
}

