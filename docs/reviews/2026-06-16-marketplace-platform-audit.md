# 码上好交易平台当前工程审核报告

审核日期：2026-06-18
审核对象：`feature/marketplace-platform` 当前 HEAD `f6927a0`
审核方式：代码审查、迁移验证、单元/集成测试、Playwright 端到端测试
审核结论：工程师已把第一阶段本地模拟交易闭环推进到可演示、可端到端验证的水平；但当前仍不是生产可运营平台，真实微信支付、真实退款/分账/对账、生产部署与外部资质仍未完成。本次完整 Vitest 还暴露了未处理异常，因此不能诚信地宣称“所有测试全部通过”。

## 1. 执行摘要

相较上一版审核，当前工程已明显前进：支付页已经具备创建并确认模拟支付的 UI；订单交付、验收、模拟结算、评价可通过页面走通；通知持久化、订单文件上传签名、治理动作、模拟退款执行也已有实现与测试覆盖。新增的 `tests/e2e/full-ui-flow.spec.ts` 是真正点击页面的交易闭环 smoke test，而不是单纯服务层调用。

我对当前状态的专业判断是：

- 可以称为“第一阶段本地模拟交易平台闭环基本完成，并已通过 Playwright UI 闭环验证”。
- 可以用于内部演示、继续验收、部署预检和真实支付接入前准备。
- 不能称为“正式可运营交易平台”。
- 不能称为“真实资金闭环已完成”。
- 不能称为“完整测试套件全部无异常”，因为 Supabase 环境下完整 Vitest 进程退出码为 1。

## 2. Fresh Verification Evidence

以下命令均为本次审核重新运行，不引用旧结果。

### 2.1 基础验证

Command:

```bash
pnpm verify
```

Result:

- ESLint passed.
- TypeScript passed.
- 默认 Vitest：10 files passed，8 skipped；26 tests passed，32 skipped。
- Next build passed。
- 36 个 App Router 页面/API 成功构建，包含 `/api/files/download`、客户/开发者需求页、订单页、后台页和 proxy middleware。

Important note:

默认 `pnpm verify` 中的 `pnpm test` 会跳过依赖 Supabase 环境的集成测试，因此它只能证明基础 lint/type/build 与非数据库测试通过，不能单独代表完整业务验证。

### 2.2 数据库迁移验证

Command:

```bash
pnpm exec supabase db reset
```

Result:

- Local database reset succeeded。
- 所有迁移从 `202606150001_identity.sql` 到 `202606170006_storage_order_files.sql` 均成功应用。
- Seed completed。

### 2.3 完整 Vitest with Supabase env

Command:

```bash
pnpm vitest run
```

with local Supabase env exported from `supabase status -o env`.

Result:

- Test Files: 18 passed。
- Tests: 58 passed。
- Errors: 3 unhandled errors。
- Exit code: 1。

Failure detail:

`tests/unit/components/layout-shells.test.tsx` 相关测试在运行结束阶段触发 3 个 `ReferenceError: window is not defined` 未处理异常，堆栈来自 `react-dom-client` scheduler。测试断言本身全部通过，但 Vitest 正确地把未处理异常视为失败风险。

Assessment:

业务断言覆盖看起来是绿的，但测试进程失败不能忽略。需要修复该测试的渲染清理/异步调度问题，或定位 React 19 + jsdom/Vitest 配置的不兼容点。

### 2.4 Playwright 端到端验证

Command:

```bash
pnpm test:e2e
```

with local Supabase env and `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`.

Result:

- 17 tests passed。
- 包含 `tests/e2e/full-ui-flow.spec.ts` 的完整点击式 UI smoke test。

Covered UI path:

`客户 Magic Link 登录 -> 发布需求 -> 管理员审核发布 -> 开发者报价 -> 客户选标 -> 页面创建并确认模拟支付 -> 开发者交付 -> 客户验收 -> 模拟结算 -> 客户评价 -> 数据库最终订单 completed 与评价校验`

## 3. 当前完成度判断

### 已完成或基本完成

- Next.js + TypeScript 工程、公开站、工作台、运营后台基础结构。
- Supabase schema、RLS、核心 RPC、迁移与 seed。
- 邮箱 Magic Link、手机号 OTP、本地同账号验证路径、角色切换。
- 开发者申请与审核。
- 客户发布需求、后台审核发布、需求市场与详情。
- 开发者报价、客户选标、事务化订单创建。
- 支付页创建并确认模拟支付。
- 订单留言、正式交付、验收、拒收、评价。
- 模拟结算：`accepted -> completed`，并写入 `profit_shares`。
- 争议发起、仲裁后进入退款审核。
- 模拟退款执行：`refund_review -> refunding -> refunded`，失败可回到 `refund_review` 重试。
- 站内通知持久化仓储，并接入留言、交付、验收、模拟结算、争议退款等关键事件。
- 私有订单文件上传签名与下载短链授权。
- 运营治理动作：封禁/解封用户、冻结/解冻订单、暂停/恢复需求、支付人工核对审计。
- 安全基础：Origin 检查、内存限流、日志脱敏、幂等工具。
- 完整点击式 UI smoke test 覆盖第一阶段主交易路径。
- 腾讯云部署预检/服务器初始化文档已经开始补充。

### 仍未完整

- 真实微信支付下单、回调验签、退款、分账、对账未接入。
- 二级商户真实进件和收款账户流程未完成。
- 生产支付/退款/分账后台仍未达到真实运营要求。
- 生产监控、告警、审计留存、客服介入 SOP 和对账作业仍未实际验证。
- Supabase Storage 的本地文件签名路径已实现，但生产 bucket、权限、对象生命周期与 CDN/防盗链策略未验证。
- 当前限流与幂等为应用内存级基础设施，不适合多实例生产部署。
- 完整 Vitest 在 Supabase 环境下仍有未处理异常，需修复后才能作为合并/交付门禁。
- 仓库存在未跟踪文件，需要工程师决定纳入版本控制、忽略或清理。

## 4. Findings

### P1: 完整 Vitest 进程失败，不能作为全绿交付

Evidence:

- `pnpm vitest run` with Supabase env: 18 files passed，58 tests passed，但 Vitest caught 3 unhandled errors，exit code 1。
- 错误为 `ReferenceError: window is not defined`，关联 `tests/unit/components/layout-shells.test.tsx`。

Impact:

即使业务断言全部通过，未处理异常可能掩盖 React 组件测试的异步清理问题或测试环境配置问题。CI 若运行完整套件会失败。

Recommendation:

修复 `layout-shells.test.tsx` 的 render cleanup/异步 flush 问题，或调整 Vitest/jsdom 配置，确保完整 Supabase 环境下 `pnpm vitest run` exit code 为 0。

### P1: 当前仍不能宣称“正式交易平台可运营”

Evidence:

- 支付实现仍是 `MockPaymentProvider` 与模拟结算/退款。
- 文档和代码均未完成真实微信支付商户接入、真实回调、真实退款、真实分账、账单对账。

Impact:

对外如果宣称可正式运营，会误导真实资金安全、合规和交付能力。

Recommendation:

继续使用“本地模拟交易闭环已完成，真实资金链路待微信支付/商户/部署条件确认后接入”的口径。

### P1: 生产部署与外部资质仍是未验证状态

Evidence:

- 新增 `docs/deployment/tencent-cloud-preflight.md` 与 `docs/deployment/tencent-cloud-server-init.md`，但目前仍是部署准备文档。
- 当前审核没有验证公网域名、HTTPS、ICP/备案、微信支付回调域名、生产 Supabase/数据库、对象存储和告警。

Impact:

本地 E2E 通过不等同于生产可上线。真实支付尤其依赖域名、证书、回调可达性、商户资料和安全配置。

Recommendation:

将部署预检转化为可执行 checklist，并在生产/预生产环境完成一次从登录到订单完成的验收。

### P2: 内存级安全基础设施不适合多实例生产

Evidence:

- 现有限流和幂等工具是应用内存级实现。

Impact:

多实例、serverless 或重启场景下无法保证全局限流和幂等，支付/订单类接口尤其不能依赖单进程内存。

Recommendation:

生产前迁移到数据库、Redis 或平台级 KV，并为支付创建/确认/退款等接口设置跨实例幂等约束。

### P2: 仓库存在未跟踪文件，交付边界需要整理

Evidence:

`git status --short` 显示：

- `.env.production.example`
- `commit-session.sh`
- `docs/deployment/`
- `scripts/reporting/__pycache__/`

Impact:

部署文档和生产 env 示例看起来应该纳入版本控制；`__pycache__` 通常不应提交。当前边界不清会影响交付审查。

Recommendation:

确认 `.env.production.example`、`commit-session.sh`、`docs/deployment/` 是否属于本次工程交付；若属于，应纳入提交。将 `__pycache__/` 清理或加入 `.gitignore`。

## 5. Positive Findings

- 支付 UI 闭环已补齐：页面可创建并确认模拟支付。
- 完整 UI smoke test 真实点击页面完成了第一阶段主交易路径。
- 通知从内存模型推进到 Supabase 持久化仓储，并有集成测试覆盖。
- 订单文件上传/下载采用私有 bucket + 短期签名授权，方向正确。
- 治理动作开始落地，并记录 audit log。
- 模拟退款执行具备状态机、审计、通知和失败重试路径。
- Supabase 迁移可从零重置并全部应用，说明 schema 演进目前一致。
- `pnpm verify` 和 Playwright E2E 均通过，基础质量与浏览器主流程有证据支撑。

## 6. Honest Status Statement

准确说法：

> 当前项目已基本完成第一阶段“本地模拟交易平台”的主闭环：需求、审核、报价、选标、模拟支付、交付、验收、模拟结算、评价已可通过 UI 端到端走通；通知、文件签名、治理和模拟退款也有工程实现。但它仍不是生产可运营平台，真实微信支付/退款/分账/对账、生产部署和外部资质尚未完成；完整 Vitest 在 Supabase 环境下仍有未处理异常需要修复。

不准确说法：

> 平台已经可以正式上线收款。

> 所有测试全部通过。

> 微信支付担保交易、退款、分账已经完成。

## 7. Recommended Next Actions

1. 修复 `pnpm vitest run` 的 `window is not defined` 未处理异常，并把完整 Supabase Vitest 纳入交付门禁。
2. 整理未跟踪文件：提交应交付文档/示例，清理或忽略 `__pycache__/`。
3. 把真实微信支付接入拆为独立阶段：商户资料、回调域名、下单、回调验签、退款、分账、对账、异常重试。
4. 将内存限流/幂等迁移到生产级共享存储。
5. 在预生产环境跑一次完整 UI 交易验收，并补充部署、监控、告警和数据备份证据。
