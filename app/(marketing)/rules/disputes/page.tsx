import type { Metadata } from "next";

import { RulePage } from "@/components/marketing/rule-page";

export const metadata: Metadata = {
  title: "争议处理规则 | 码上好",
  description: "码上好拒绝验收、证据提交、人工仲裁与全额退款评审规则。",
  alternates: { canonical: "/rules/disputes" },
};

export default function DisputeRulesPage() {
  return (
    <RulePage
      description="协商无法解决时，平台根据订单内留存证据进行人工评审。"
      title="争议处理规则"
    >
      <h2>发起条件</h2>
      <p>交付不符合约定、无法继续履约或双方对验收结论存在分歧时，可从对应订单发起争议。</p>
      <h2>有效证据</h2>
      <p>需求版本、报价、订单留言、附件、交付物、验收理由和状态历史均可作为评审依据。</p>
      <h2>处理结果</h2>
      <p>首版处理结果限于继续履约、确认验收或进入全额退款评审，不支持部分退款。</p>
      <h2>渠道限制</h2>
      <p>退款是否可执行及到账时间受支付渠道权限、订单结算状态和正式产品规则约束。</p>
    </RulePage>
  );
}

