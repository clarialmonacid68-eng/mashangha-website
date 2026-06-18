# 码上好交易平台当前工程审核报告

审核日期：2026-06-16
审核对象：`feature/marketplace-platform` 当前 HEAD `989851a`
审核方式：代码审查、迁移验证、单元/集成测试、Playwright 流程测试
审核结论：第一阶段工程基础与主要业务服务已显著推进，验证结果当前为全绿；但仍不能诚信地声明“可正式运营的完整交易平台”或“真实资金闭环已完成”。

## 1. 执行摘要

当前工程师已完成的范围已经超过上一版审查报告。最新提交包含：

- 第一阶段交易平台主体：认证、双角色、开发者申请、需求、报价、选标、订单、模拟支付、留言、交付、验收、评价、争议。
- 运营后台初版：开发者审核、需求审核、订单查看、争议查看、风控查看、审计日志。
- 安全加固：写接口 Origin/Server Action 检查、简单内存限流、幂等工具、日志脱敏。
- 文档与支付前置：微信支付申请材料、资金流/订单流、退款争议政策、微信支付安全骨架设计。
- 测试覆盖：基础验证、Supabase 迁移、数据库集成测试、Playwright 流程测试均已重新跑通。

需要诚实区分的是：当前适合描述为“本地可验证的第一阶段业务闭环雏形”，不是“生产可运营平台”。真实微信支付、真实退款、真实分账、账单对账、生产级通知、真实文件上传和完整后台操作仍未完成。

## 2. Fresh Verification Evidence

本次审核重新运行了以下命令，结果如下。

### 2.1 基础验证

Command:

```bash
pnpm verify
```

Result:

- ESLint passed.
- TypeScript passed.
- Vitest default suite: 9 files passed, 7 skipped.
- Tests: 25 passed, 25 skipped.
- Next build passed.
- 32 个 App Router 页面/API 成功构建。
- Proxy/Middleware 成功构建。

Important note:

默认 `pnpm test` 仍会跳过依赖 Supabase 环境变量的数据库集成测试。因此 `pnpm verify` 不能单独代表完整业务验证。

### 2.2 数据库迁移验证

Command:

```bash
pnpm exec supabase db reset
```

Result:

- Local database reset succeeded.
- All migrations from `202606150001_identity.sql` through `202606160007_notifications.sql` applied cleanly.
- Seed completed.

### 2.3 完整 Vitest with Supabase env

Command:

```bash
pnpm vitest run
```

with local Supabase env exported from `supabase status -o env`.

Result:

- Test Files: 16 passed.
- Tests: 50 passed.
- No skipped tests in this environment.

### 2.4 Playwright 流程验证

Command:

```bash
pnpm test:e2e
```

with local Supabase env and `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`.

Result:

- 16 tests passed.
- 覆盖公开页、认证、管理员访问控制、开发者审核审计、客户选标/模拟付款服务流、开发者交付/客户验收评价服务流、争议退款裁决服务流、Origin 安全检查。

Important note:

新增的若干 Playwright 测试是“在 Playwright runner 内直接调用领域服务和 Supabase”的流程测试，并非完整浏览器逐页点击的 UI E2E。例如客户付款、开发者交付、争议裁决等路径主要验证服务层和数据库结果，不等同于完整 UI 可用性验收。

## 3. 当前完成度判断

### 已完成或基本完成

- Next.js + TypeScript 工程初始化。
- 设计系统和公开站/工作台/后台壳布局。
- Supabase 核心 schema、RLS 和数据库 RPC。
- 邮箱 Magic Link、手机号 OTP、本地同账号验证路径、角色切换。
- 公开页面迁移、规则页、动态 sitemap/robots。
- 开发者资料提交与审核状态。
- 需求发布、提交审核、后台发布/拒绝。
- 需求市场筛选和需求详情。
- 开发者报价、客户选标、事务化订单创建。
- 模拟支付服务层：创建、确认、关闭。
- 订单留言、附件元数据、正式交付。
- 验收、拒收、评价函数。
- 争议发起、全额退款裁决状态推进。
- 运营后台初版和审核审计。
- 安全控制基础：Origin/CSRF 风险拦截、内存限流、日志脱敏、幂等工具。
- 微信支付申请/资金流/退款政策文档和安全骨架设计。

### 仍未完整

- 真实微信支付下单、回调、退款、分账、对账。
- 二级商户真实进件和收款账户页面。
- 用户界面中的完整模拟支付确认路径。
- 用户界面中的完整交付、验收、评价、争议全流程点击式 E2E。
- 真实文件上传到 Supabase Storage 和短时签名链接。
- 通知服务持久化仓储和业务事件自动触发。
- 退款执行记录、渠道退款状态机和失败重试。
- 运营后台的真实高风险动作：封禁用户、暂停需求、冻结订单、异常支付处理。
- 支付/退款/分账/对账后台。
- 生产级风控、监控、告警、客服流程和数据留存策略落地。

## 4. Findings

### P0: 当前仍不能宣称“正式交易平台可运营”

当前系统已经可以本地验证很多第一阶段流程，但真实资金和生产运营关键能力尚未完成。文档也明确微信支付仍 blocked/pending confirmation。

Evidence:

- `docs/payments/wechat-application-checklist.md` 仍有大量“待补充”和 blocked 条件。
- `docs/payments/funds-flow.md` 明确真实微信支付上线前只能承载模拟支付和设计验证。
- `docs/payments/refund-dispute-policy.md` 明确真实资金退款由后续 Task 18 实现。

Impact:

对外或对团队汇报时，不能说“已具备资金托管、担保交易、真实退款、自动分账能力”。准确表述应为“第一阶段本地业务闭环与模拟支付已可验证，真实支付闭环尚未上线”。

Recommendation:

继续在页面、销售话术和报告中使用“模拟支付/本地验证/真实支付 blocked”的口径。

### P1: Playwright 流程测试不完全等于 UI E2E

`tests/e2e/customer-flow.spec.ts`、`developer-flow.spec.ts`、`dispute-flow.spec.ts` 主要直接调用领域服务和 Supabase client。它们验证了服务层和数据库状态，但没有逐步点击实际 UI 完成报价、付款、交付、验收、评价和争议处理。

Evidence:

- `customer-flow.spec.ts` 直接调用 `createDemandDraft`、`publishDemand`、`createQuote`、`selectQuoteForOrder`、`createOrderPayment`、`confirmMockPayment`。
- `developer-flow.spec.ts` 直接调用 `createOrderMessage`、`submitOrderDelivery`、`acceptOrderDelivery`，并用 admin client 手动把订单改成 `completed` 后再评价。
- `dispute-flow.spec.ts` 直接调用 `rejectOrderDelivery`、`openOrderDispute`、`resolveDisputeAsFullRefund`。

Impact:

测试结果可信，但验证层级应称为“服务层端到端流程测试”或“Playwright runner 下的集成流程测试”，不能夸大为完整用户界面 E2E。

Recommendation:

后续补 1 条真正 UI 点击式 smoke test：

`客户登录 -> 发布需求 -> 管理员审核 -> 开发者报价 -> 客户选标 -> 页面创建并确认模拟支付 -> 开发者页面交付 -> 客户页面验收 -> 评价`

### P1: 支付页面仍缺少直接确认模拟支付的 UI 动作

支付后端有 `POST /api/payments/mock/confirm`，服务层测试也能确认支付；但 `app/(workspace)/workspace/orders/[id]/pay/page.tsx` 当前只创建模拟支付单并显示 payment id，没有页面按钮直接确认付款。

Evidence:

- Pay page `createPayment()` 创建支付单并 redirect 回 query `payment=...`。
- 页面展示“模拟支付单已创建”，但没有表单调用 confirm endpoint。
- E2E 客户付款流程直接调用 `confirmMockPayment(admin, provider, ...)`，绕过页面。

Impact:

用户从浏览器界面还不能自然完成模拟付款闭环。

Recommendation:

在本地/测试环境为 payment id 增加“确认模拟支付”按钮，调用 `/api/payments/mock/confirm`，并把用户带到订单详情。随后增加 UI E2E。

### P1: 评价路径仍依赖人工/服务端完成订单状态

`create_order_review()` 要求订单为 `completed`。当前自然业务流验收后进入 `accepted`，尚无模拟分账服务将 `accepted -> sharing -> completed`。测试中用 admin client 手动更新订单为 `completed`。

Impact:

评价函数可用，但“验收后可评价”的产品闭环还没自然打通。

Recommendation:

第一阶段应新增模拟结算/完成订单动作，或在 UI 上明确“评价将在结算完成后开放”。真实分账上线前不要暗示验收即完成结算。

### P1: 通知仍未持久接入业务事件

通知表、通知中心页和内存分发器存在，但当前服务层没有把需求审核、报价、支付、留言、交付、验收、退款、仲裁等业务事件写入 `notifications` 表。

Impact:

通知中心页面可显示已有通知，但主流程不会自然产生站内通知。

Recommendation:

实现 Supabase-backed `NotificationRepository`，并在关键 RPC/service 成功后写通知。补 recipient RLS 测试和通知中心 UI 测试。

### P1: 运营后台仍是初版，不是“完整后台”

后台已有页面和开发者/需求审核动作，但订单、争议、风控、审计大多是查看型。风控页面文案也说明冻结动作后续接入。支付、退款、分账、对账后台尚未实现。

Impact:

可以称为“运营后台初版”或“审核/查看后台”，不能称为完整运营后台。

Recommendation:

补齐：

- 订单冻结/解冻。
- 封禁/解封用户。
- 暂停需求。
- 争议裁决 UI。
- 退款执行和失败重试。
- 支付/退款/分账/对账页面。

### P2: 进度报告仍过期

`docs/reports/2026-06-16-marketplace-progress-report.md` 当前仍写最新提交是 `ad0b85b`，范围到 Task 8。当前 HEAD 是 `989851a`，已包含后续多个提交。

Impact:

如果该报告被分享，会误导读者当前进度和验证结果。

Recommendation:

重新生成 `docs/reports/2026-06-16-marketplace-progress-report.md` 和对应 docx，或标记旧报告为 superseded。

## 5. Positive Findings

- Fresh `pnpm verify` 通过。
- Fresh `supabase db reset` 通过。
- Fresh Supabase-backed Vitest 50/50 通过。
- Fresh Playwright 16/16 通过。
- 之前发现的两个阻塞点已有明显改善：
  - `/workspace/customer/demands/new` 已存在。
  - 本地 email/phone same-account 测试已通过。
- 交易服务层比上一轮完整很多，已能验证需求、报价、选标、模拟付款、交付、验收、争议裁决等关键状态变化。
- 管理员访问控制和开发者审核审计已有 E2E 覆盖。
- Origin 检查和日志脱敏有单元/E2E 覆盖。
- 微信支付相关文档采用 blocked/disabled 口径，没有贸然宣称真实资金能力。

## 6. Honest Status Statement

准确说法：

> 当前项目已经完成第一阶段本地交易平台的大部分工程骨架和服务层业务闭环，所有 fresh 验证命令在本地通过。系统可用于继续做本地验收、演示和后续真实支付接入准备。

不准确说法：

> 当前项目已经是生产可运营的完整交易平台。

也不准确：

> 当前已经具备微信支付资金托管、真实退款、自动分账和对账能力。

## 7. Recommended Next Work

1. 为模拟支付补完整 UI 确认动作和浏览器 E2E。
2. 增加模拟结算/完成订单路径，打通验收后评价。
3. 将通知接入 Supabase 持久仓储和业务事件触发。
4. 补争议裁决 UI、退款执行服务和后台操作审计。
5. 补真实文件上传与签名 URL 访问验证。
6. 更新过期的 `docs/reports/2026-06-16-marketplace-progress-report.md` 和 `.docx`。
7. 真实微信支付未完成书面确认前，继续保持 Task 17-19 blocked。
