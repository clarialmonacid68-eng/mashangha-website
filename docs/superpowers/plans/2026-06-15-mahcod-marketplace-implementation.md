# 码上好 AI 开发交易平台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 6 页静态原型升级为支持双角色账号、需求、报价、全额付款订单、履约交付、验收、微信分账、退款仲裁和运营后台的响应式 Web 平台。

**Architecture:** 使用单一 Next.js + TypeScript 工程承载公开网站、用户工作台和运营后台；PostgreSQL、认证与私有对象存储的具体生产供应商由 Task 0 的中国大陆可用性验证决定，Supabase 是首选候选而非无条件前提。交易核心使用渠道无关的订单状态机和支付适配器，第一期运行模拟支付，第二期替换为微信支付平台型产品、二级商户与分账实现。

**Tech Stack:** Next.js App Router、TypeScript、Tailwind CSS、PostgreSQL、对象存储、OTP 认证、Zod、React Hook Form、Vitest、Testing Library、Playwright、微信支付 API v3；Supabase 与 Vercel 为待验证候选

---

## 交付节奏与现实边界

| 周期 | 目标 |
|---|---|
| 第 0 周 | 微信支付准入、短信、部署与备案可行性验证；通过后锁定生产架构 |
| 第 1 周 | 工程、数据库、认证和设计系统 |
| 第 2 周 | 开发者认证、需求发布与审核 |
| 第 3 周 | 报价、选标、订单、模拟支付 |
| 第 4 周 | 留言、附件、交付、验收、评价 |
| 第 5 周 | 仲裁、通知、第一期运营后台 |
| 第 6 周 | 安全加固、端到端测试、第一期上线 |
| 第 7–8 周 | 微信二级商户、支付、回调、退款与分账 |
| 第 9–10 周 | 对账、异常恢复、支付验收与正式资金闭环 |

**承诺口径：**

- 8 周是产品开发目标，不包含不可控的微信支付产品审核等待时间。
- 10 周是支付资料齐全、准入顺利时的计划上限，不是保证上线日期。
- 若第 0 周发现 Vercel、Supabase Auth、短信服务、备案或微信支付产品不适配中国大陆运营，必须先调整架构，不能按原计划继续堆功能。
- 微信支付审核若提前完成，可将第 7–10 周任务前移；若延期，第一期只开放撮合和订单管理，不展示资金托管承诺。
- 1 名全栈开发者的第一期后台只实现审核、订单、仲裁和审计必需能力；支付对账、退款、分账和支付风控页面随第二期逐项开放。

## 目标目录

```text
app/
  (marketing)/
  (auth)/
  (workspace)/
  admin/
  api/
components/
  marketing/
  workspace/
  admin/
  ui/
lib/
  auth/
  db/
  domain/
  payments/
  storage/
  notifications/
  security/
supabase/
  migrations/
  seed.sql
tests/
  unit/
  integration/
  e2e/
```

### Task 0: 验证中国大陆运营与支付前置条件

**Files:**
- Create: `docs/feasibility/china-production-readiness.md`
- Create: `docs/payments/wechat-product-decision.md`
- Create: `docs/architecture/production-hosting-decision.md`
- Create: `docs/auth/sms-provider-decision.md`

- [x] **Step 1: 建立可行性判定表**

`docs/feasibility/china-production-readiness.md` 必须逐项记录 `通过 / 不通过 / 有条件通过`、证据链接、负责人和截止日期：

```markdown
| 项目 | 判定 | 证据 | 负责人 | 截止日期 |
|---|---|---|---|---|
| 域名实名认证与 ICP 备案路径 |  |  |  |  |
| 中国大陆用户访问部署区域的延迟和稳定性 |  |  |  |  |
| 邮箱 OTP 到达率 |  |  |  |  |
| 中国手机号 OTP 服务商与模板审核 |  |  |  |  |
| 微信支付业务类目准入 |  |  |  |  |
| 二级商户主体要求 |  |  |  |  |
| 分账、退款和佣金规则 |  |  |  |  |
```

- [ ] **Step 2: 验证部署候选**

分别对候选方案做最小部署和中国大陆网络实测：

```text
A. Vercel + Supabase
B. 中国香港或新加坡 Node 托管 + 托管 PostgreSQL
C. 中国大陆云服务 + 已备案域名 + PostgreSQL/对象存储
```

记录首页 TTFB、登录 API 延迟、文件上传延迟和连续 24 小时可用性。生产方案必须基于数据选择，不预设 Vercel 一定可用。

- [ ] **Step 3: 验证手机号与邮箱 OTP**

使用至少 3 个中国大陆手机号和 3 个常用邮箱域测试：

```text
成功到达率目标：>= 95%
验证码到达时间目标：P95 <= 60 秒
失败时必须有可追踪的服务商错误码
```

若 Supabase Phone Auth 不满足目标，`docs/auth/sms-provider-decision.md` 必须选定国内短信服务商，并明确由应用服务端生成/校验 OTP 或使用兼容认证桥接方案。

- [ ] **Step 4: 前置确认微信支付产品**

向微信支付取得后台工单、邮件或合同附件等可追溯依据，确认：

- 软件开发撮合业务是否准入。
- 平台和开发者分别以什么主体入驻。
- 二级商户进件所需字段和敏感资料传输方式。
- 支付后何时可以分账。
- 未分账退款和已分账退款的具体路径。
- 平台佣金、支付通道费、分账费用和结算周期。
- 是否存在保证金、交易限额或行业特殊限制。

未确认的字段在 `wechat-product-decision.md` 中标记为 `blocked`，第二期相关任务不得开始。

- [x] **Step 5: 做架构闸门决策并提交**

只有以下条件全部满足才进入 Task 1：

```text
生产部署方案已选定
手机号和邮箱 OTP 均有可执行方案
ICP备案路径明确
微信支付业务准入已获得可追溯确认，或明确采用第一期无支付模式
```

若生产方案不是 Vercel + Supabase，必须先把本计划中对应的 Supabase CLI、Auth、Storage、定时任务和部署命令替换为选定供应商的准确命令，再开始 Task 1。

```bash
git init
git add docs
git commit -m "docs: validate production and payment feasibility"
```

## 第一阶段：真实业务闭环

### Task 1: 初始化 Next.js 工程与测试工具

**Files:**
- Preserve: `legacy/index.html`
- Preserve: `legacy/demand.html`
- Preserve: `legacy/post-demand.html`
- Preserve: `legacy/developers.html`
- Preserve: `legacy/developer.html`
- Preserve: `legacy/join.html`
- Preserve: `legacy/styles.css`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [x] **Step 1: 把当前静态文件移入 `legacy/`**

Run:

```bash
mkdir legacy
mv index.html demand.html post-demand.html developers.html developer.html join.html styles.css legacy/
```

Expected: Task 0 已初始化 Git；根目录保留文档和 SEO 文件，原型文件全部位于 `legacy/`。

- [x] **Step 2: 创建 Next.js 工程**

当前目录已有文档，先在临时目录生成脚手架，再同步到项目根目录：

```bash
pnpm create next-app@latest /tmp/mahcod-next-scaffold --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
rsync -a --exclude='.git' /tmp/mahcod-next-scaffold/ ./
pnpm add @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

Expected: 原有 `docs/`、`legacy/` 和 Markdown 文档仍存在，`pnpm dev` 可启动，`app/page.tsx` 可访问。

- [x] **Step 3: 添加统一脚本**

`package.json` 必须包含：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

- [x] **Step 4: 配置环境变量清单**

`.env.example`：

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=mock
WECHATPAY_MCH_ID=
WECHATPAY_APP_ID=
WECHATPAY_SERIAL_NO=
WECHATPAY_PRIVATE_KEY=
WECHATPAY_API_V3_KEY=
WECHATPAY_NOTIFY_URL=
```

- [x] **Step 5: 验证并提交**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git add .
git commit -m "chore: initialize marketplace application"
```

Expected: 所有命令成功，生成首次提交。

### Task 2: 建立设计系统与三类布局

**Files:**
- Create: `app/globals.css`
- Create: `components/ui/button.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/status-badge.tsx`
- Create: `components/marketing/site-header.tsx`
- Create: `components/marketing/site-footer.tsx`
- Create: `components/workspace/workspace-shell.tsx`
- Create: `components/admin/admin-shell.tsx`
- Test: `tests/unit/components/status-badge.test.tsx`

- [x] **Step 1: 写状态徽标失败测试**

```tsx
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/status-badge";

it("renders the Chinese label for an order status", () => {
  render(<StatusBadge status="pending_payment" />);
  expect(screen.getByText("待付款")).toBeInTheDocument();
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/unit/components/status-badge.test.tsx`  
Expected: FAIL，模块尚不存在。

- [x] **Step 3: 实现品牌变量和基础组件**

`StatusBadge` 使用穷尽映射，不允许未知状态静默显示：

```tsx
const labels = {
  pending_payment: "待付款",
  in_progress: "履约中",
  delivered: "待验收",
  accepted: "待结算",
  sharing: "结算中",
  completed: "已完成",
  closed: "已关闭",
  refund_review: "退款审核中",
  refunding: "退款处理中",
  disputed: "争议中",
  refunded: "已退款",
  share_failed: "结算失败",
} as const;

export function StatusBadge({ status }: { status: keyof typeof labels }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
```

设计规则：

- 营销页使用暖白、珊瑚橙和青绿色，保留现有品牌识别。
- 工作台和后台使用白色、浅灰、细边框与少量品牌色。
- 移动端导航可折叠，工作台侧栏在移动端变为顶部入口。
- 所有交互元素必须具备键盘焦点样式。

- [x] **Step 4: 运行组件测试和视觉烟雾测试**

Run:

```bash
pnpm vitest run tests/unit/components/status-badge.test.tsx
pnpm dev
```

Expected: 单元测试通过；三类布局在桌面和手机宽度无横向滚动。

- [x] **Step 5: 提交**

```bash
git add app components tests
git commit -m "feat: add marketplace design system and layouts"
```

### Task 3: 创建数据库核心模型和权限基础

**Files:**
- Create: `supabase/migrations/202606150001_identity.sql`
- Create: `supabase/migrations/202606150002_marketplace.sql`
- Create: `supabase/migrations/202606150003_orders.sql`
- Create: `supabase/migrations/202606150004_governance.sql`
- Create: `lib/db/types.ts`
- Test: `tests/integration/database/rls.test.ts`

- [x] **Step 1: 写越权访问集成测试**

测试必须验证：

```ts
it("prevents a customer from reading another customer's private order", async () => {
  const result = await asUser(customerB).from("orders").select("*").eq("id", customerAOrderId);
  expect(result.data).toEqual([]);
});
```

- [x] **Step 2: 创建枚举、表和约束**

迁移必须定义：

```sql
create type app_role as enum ('customer', 'developer', 'admin');
create type review_status as enum ('draft', 'pending', 'approved', 'rejected');
create type demand_status as enum ('draft', 'pending_review', 'published', 'matched', 'closed');
create type quote_status as enum ('active', 'selected', 'withdrawn', 'expired', 'rejected');
create type order_status as enum (
  'pending_payment', 'in_progress', 'delivered', 'accepted',
  'sharing', 'completed', 'closed', 'refund_review',
  'refunding', 'refunded', 'disputed', 'share_failed'
);
```

所有金额字段使用 `bigint` 分；关键表必须含 `created_at`、`updated_at`；订单固化 `amount_cents` 与 `commission_bps`，并包含用于乐观并发的 `version bigint not null default 0`。

- [x] **Step 3: 实施 RLS**

权限合同：

- 公开用户只能读取已审核开发者和已发布需求。
- 客户只能管理自己的需求并读取自己的订单。
- 开发者只能读取公开需求、管理自己的报价和参与订单。
- 订单参与方可以读取订单留言与文件元数据。
- 只有服务端管理角色可以写支付、退款、分账和审计表。
- 管理员权限由服务端检查，不仅依赖前端路由隐藏。

- [x] **Step 4: 应用迁移并生成类型**

Run:

```bash
supabase start
supabase db reset
supabase gen types typescript --local > lib/db/types.ts
pnpm vitest run tests/integration/database/rls.test.ts
```

Expected: 数据库重建成功，越权测试通过。

- [x] **Step 5: 提交**

```bash
git add supabase lib/db tests/integration/database
git commit -m "feat: add marketplace schema and row security"
```

### Task 4: 实现手机号、邮箱验证码与双角色账号

**Files:**
- Create: `lib/auth/server.ts`
- Create: `lib/auth/client.ts`
- Create: `lib/auth/guards.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/verify/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `app/(workspace)/workspace/layout.tsx`
- Create: `app/(workspace)/workspace/settings/page.tsx`
- Test: `tests/unit/auth/guards.test.ts`
- Test: `tests/e2e/auth.spec.ts`

- [x] **Step 1: 写权限守卫测试**

```ts
expect(canAccessWorkspace(["customer"], "customer")).toBe(true);
expect(canAccessWorkspace(["customer"], "developer")).toBe(false);
expect(canAccessWorkspace(["customer", "developer"], "developer")).toBe(true);
```

- [x] **Step 2: 实现登录流程**

登录页提供两个标签：

- 手机号验证码：E.164 格式存储，中国号码 UI 默认 `+86`。
- 邮箱验证码：使用 magic link 或 OTP，并统一回到 `/auth/callback`。

首次登录事务中创建 `profiles` 和默认 `customer` 角色。申请开发者认证时添加 `developer` 角色，但认证通过前不可报价。

- [x] **Step 3: 实现角色切换**

工作台切换只改变界面上下文，不创建第二账号。当前角色保存在安全 cookie；服务端每次读取时必须验证用户确实拥有该角色。

- [x] **Step 4: 验证**

Run:

```bash
pnpm vitest run tests/unit/auth/guards.test.ts
pnpm playwright test tests/e2e/auth.spec.ts
```

Expected: 手机和邮箱登录均进入同一账号；未认证开发者无法进入报价操作。

- [x] **Step 5: 提交**

```bash
git add app lib/auth tests
git commit -m "feat: add otp authentication and role switching"
```

### Task 5: 迁移公开网站并补齐合规页面

**Files:**
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/demands/page.tsx`
- Create: `app/(marketing)/developers/page.tsx`
- Create: `app/(marketing)/developers/[id]/page.tsx`
- Create: `app/(marketing)/rules/service/page.tsx`
- Create: `app/(marketing)/rules/privacy/page.tsx`
- Create: `app/(marketing)/rules/trading/page.tsx`
- Create: `app/(marketing)/rules/disputes/page.tsx`
- Create: `components/marketing/home-sections.tsx`
- Test: `tests/e2e/public-pages.spec.ts`

- [x] **Step 1: 写公开页面 E2E 测试**

验证首页主 CTA、需求市场、开发者市场、规则页、移动端导航均可访问且没有静态原型中的虚假成交数字。

- [x] **Step 2: 迁移现有内容**

使用 `legacy/` 作为文案和视觉参考，删除或替换：

- 虚构成交量、评分、开发者和需求数字。
- 尚未取得能力时的“资金托管”“保证退款”“30 天售后”承诺。
- 无目标的登录链接和 `alert()` 演示逻辑。

- [x] **Step 3: 补齐元数据**

每个公开页面设置唯一 title、description、canonical；生成 `app/sitemap.ts` 与 `app/robots.ts`，移除旧静态 `sitemap.xml` 和 `robots.txt`。

- [x] **Step 4: 验证和提交**

```bash
pnpm playwright test tests/e2e/public-pages.spec.ts
pnpm build
git add app components legacy
git commit -m "feat: migrate public marketplace pages"
```

### Task 6: 开发者认证、作品和公开资料

**Files:**
- Create: `app/(workspace)/workspace/developer/profile/page.tsx`
- Create: `app/(workspace)/workspace/developer/apply/page.tsx`
- Create: `app/api/developers/apply/route.ts`
- Create: `lib/domain/developers/schema.ts`
- Create: `lib/domain/developers/service.ts`
- Create: `lib/storage/files.ts`
- Test: `tests/integration/developers/apply.test.ts`

- [x] **Step 1: 写认证申请测试**

覆盖：必填资料、至少一项技能、作品 URL 校验、未审核资料不公开、重复提交更新现有草稿而非创建重复记录。

- [x] **Step 2: 实现申请表**

字段固定为：

- 姓名或品牌名
- 城市
- 简介
- 技能
- 服务范围
- 起步价
- 作品标题、说明、链接和图片
- 联系方式
- 收款主体类型与名称

- [x] **Step 3: 实现审核状态**

状态为 `draft → pending → approved/rejected`。被拒绝时必须保存原因并允许重新提交；公开页面只读取 `approved`。

- [x] **Step 4: 验证和提交**

```bash
pnpm vitest run tests/integration/developers/apply.test.ts
git add app lib tests
git commit -m "feat: add developer onboarding and profiles"
```

### Task 7: 需求发布、审核和市场筛选

**Files:**
- Create: `app/(workspace)/workspace/customer/demands/new/page.tsx`
- Create: `app/(workspace)/workspace/customer/demands/[id]/page.tsx`
- Create: `app/(marketing)/demands/[id]/page.tsx`
- Create: `app/api/demands/route.ts`
- Create: `lib/domain/demands/schema.ts`
- Create: `lib/domain/demands/service.ts`
- Test: `tests/integration/demands/lifecycle.test.ts`

- [x] **Step 1: 写需求生命周期测试**

覆盖 `draft → pending_review → published → matched/closed`；已发布需求的客户可关闭但不能悄悄修改核心范围。

- [x] **Step 2: 实现需求表单**

字段：标题、项目类型、详细描述、预算下限/上限、期望周期、合作方式、附件。预算必须大于零且下限不高于上限。

- [x] **Step 3: 实现市场查询**

服务端支持项目类型、预算、周期、关键词和发布时间筛选；所有筛选写入 URL 查询参数，页面刷新后保持。

- [x] **Step 4: 验证和提交**

```bash
pnpm vitest run tests/integration/demands/lifecycle.test.ts
git add app lib tests
git commit -m "feat: add demand publishing and marketplace"
```

### Task 8: 报价、选标与订单生成

**Files:**
- Create: `app/(workspace)/workspace/developer/quotes/page.tsx`
- Create: `app/(workspace)/workspace/customer/demands/[id]/quotes/page.tsx`
- Create: `app/api/demands/[id]/quotes/route.ts`
- Create: `app/api/quotes/[id]/select/route.ts`
- Create: `lib/domain/quotes/service.ts`
- Create: `lib/domain/orders/state-machine.ts`
- Create: `lib/domain/orders/events.ts`
- Test: `tests/unit/orders/state-machine.test.ts`
- Test: `tests/integration/quotes/select.test.ts`

- [x] **Step 1: 写状态机和并发选标测试**

```ts
expect(transition("pending_payment", "payment_succeeded")).toBe("in_progress");
expect(() => transition("completed", "deliver")).toThrow();
```

集成测试必须并发选择两份报价，并断言只生成一个订单。

- [x] **Step 2: 定义完整状态转换矩阵**

`events.ts` 必须定义以下事件，状态机对未列出的组合一律拒绝：

```ts
export type OrderEvent =
  | "payment_succeeded"
  | "payment_expired"
  | "deliver"
  | "reject_delivery"
  | "accept_delivery"
  | "open_dispute"
  | "resolve_continue"
  | "resolve_accept"
  | "approve_refund"
  | "refund_started"
  | "refund_failed"
  | "refund_succeeded"
  | "profit_share_started"
  | "profit_share_succeeded"
  | "profit_share_failed"
  | "retry_profit_share";
```

转换矩阵：

```text
pending_payment + payment_succeeded      -> in_progress
pending_payment + payment_expired        -> closed
in_progress    + deliver                 -> delivered
in_progress    + open_dispute            -> disputed
delivered      + reject_delivery         -> in_progress
delivered      + accept_delivery         -> accepted
delivered      + open_dispute            -> disputed
disputed       + resolve_continue        -> in_progress
disputed       + resolve_accept          -> accepted
disputed       + approve_refund          -> refund_review
in_progress    + approve_refund          -> refund_review
delivered      + approve_refund          -> refund_review
refund_review  + refund_started          -> refunding
refunding      + refund_failed           -> refund_review
refunding      + refund_succeeded        -> refunded
accepted       + profit_share_started    -> sharing
sharing        + profit_share_succeeded  -> completed
sharing        + profit_share_failed     -> share_failed
share_failed   + retry_profit_share      -> sharing
```

每次状态更新必须使用乐观并发字段 `version`：

```sql
update orders
set status = :next_status, version = version + 1
where id = :id and status = :expected_status and version = :expected_version;
```

受影响行数不是 1 时返回冲突，不得覆盖其他请求刚完成的状态变化。

- [x] **Step 3: 实现报价规则**

- 仅认证通过的开发者可报价。
- 同一开发者对同一需求只有一份有效报价。
- 报价包含金额、工期、方案、有效期。
- 客户不能选择自己的开发者身份所提交的报价。

- [x] **Step 4: 事务化选标**

单个数据库事务完成：

1. 锁定需求。
2. 验证仍为 `published`。
3. 标记选中报价。
4. 拒绝其他报价。
5. 创建 `pending_payment` 订单并固化金额与佣金率。
6. 将需求改为 `matched`。

- [x] **Step 5: 验证和提交**

```bash
pnpm vitest run tests/unit/orders/state-machine.test.ts tests/integration/quotes/select.test.ts
git add app lib tests
git commit -m "feat: add quotes and transactional order creation"
```

### Task 9: 支付适配器和模拟全额付款

**Files:**
- Create: `lib/payments/types.ts`
- Create: `lib/payments/provider.ts`
- Create: `lib/payments/mock-provider.ts`
- Create: `app/api/orders/[id]/pay/route.ts`
- Create: `app/api/payments/mock/confirm/route.ts`
- Test: `tests/unit/payments/mock-provider.test.ts`
- Test: `tests/integration/payments/mock-payment.test.ts`

- [x] **Step 1: 写支付接口契约测试**

```ts
export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  queryPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  closePayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  refund(input: RefundInput): Promise<RefundResult>;
  queryRefund(providerRefundId: string): Promise<RefundSnapshot>;
  createProfitShare(input: ProfitShareInput): Promise<ProfitShareResult>;
  queryProfitShare(providerShareId: string): Promise<ProfitShareSnapshot>;
  downloadBill(input: DownloadBillInput): Promise<BillFile>;
}
```

所有写接口接收 `idempotencyKey`。测试断言重复键返回同一业务结果；查询和账单接口必须可用于恢复任务与对账。

- [x] **Step 2: 实现模拟支付**

模拟渠道必须经过与真实渠道相同的服务层：

- 从订单读取金额，拒绝客户端传入金额。
- 每个订单只有一个有效支付单。
- 待付款超时后调用 `closePayment`，确认渠道关闭后订单才进入 `closed`。
- 确认成功后事务化更新 `payments` 与 `orders`。
- 重复确认不重复记账。

- [x] **Step 3: 实现付款页**

页面显示订单摘要、开发者、全额金额、平台规则确认框和支付按钮。非订单客户不能创建支付。

- [x] **Step 4: 验证和提交**

```bash
pnpm vitest run tests/unit/payments/mock-provider.test.ts tests/integration/payments/mock-payment.test.ts
git add app lib tests
git commit -m "feat: add payment abstraction and mock checkout"
```

### Task 10: 订单留言、私有附件与正式交付

**Files:**
- Create: `app/(workspace)/workspace/orders/[id]/page.tsx`
- Create: `app/api/orders/[id]/messages/route.ts`
- Create: `app/api/orders/[id]/deliveries/route.ts`
- Create: `app/api/files/sign/route.ts`
- Create: `lib/domain/orders/service.ts`
- Create: `lib/storage/policy.ts`
- Test: `tests/integration/orders/collaboration.test.ts`

- [x] **Step 1: 写附件越权和交付测试**

覆盖：陌生用户无法获取签名 URL；开发者只能对自己的 `in_progress` 订单交付；替换交付时旧版本保留。

- [x] **Step 2: 实现留言**

留言为非实时时间线。每条记录包含发送者、正文、附件、创建时间；禁止编辑，允许管理员按审计流程隐藏违规内容。

- [x] **Step 3: 实现文件规则**

- 单文件上限由配置控制，首版建议 50 MB。
- 允许文档、图片、压缩包和常见源码归档。
- 文件路径包含订单 ID 和随机 ID，不使用原始文件名作为存储键。
- 下载前验证订单参与关系。

- [x] **Step 4: 实现正式交付**

正式交付必须有说明，并至少包含附件或交付链接。提交后订单进入 `delivered`，通知客户验收。

- [x] **Step 5: 验证和提交**

```bash
pnpm vitest run tests/integration/orders/collaboration.test.ts
git add app lib tests
git commit -m "feat: add order collaboration and delivery"
```

### Task 11: 验收、评价、全额退款与仲裁

**Files:**
- Create: `app/api/orders/[id]/accept/route.ts`
- Create: `app/api/orders/[id]/reject-delivery/route.ts`
- Create: `app/api/orders/[id]/disputes/route.ts`
- Create: `app/(workspace)/workspace/disputes/[id]/page.tsx`
- Create: `lib/domain/disputes/service.ts`
- Create: `lib/domain/refunds/policy.ts`
- Test: `tests/unit/refunds/policy.test.ts`
- Test: `tests/integration/orders/acceptance.test.ts`

- [x] **Step 1: 写退款资格和验收测试**

规则：

- 未支付订单不可退款。
- 已完成分账订单不能走普通未分账退款路径。
- 首版退款金额必须等于订单实付金额。
- 退款渠道失败时，退款记录标记为 `failed`，订单回到 `refund_review`；只有管理员可以在确认原因后再次触发 `refund_started`。
- 客户拒绝验收必须提交理由。
- 验收后立即进入 `accepted`，等待分账。

- [x] **Step 2: 实现拒绝验收和重新交付**

拒绝验收不关闭订单；订单回到 `in_progress`，保存拒绝理由，开发者可提交新交付版本。

- [x] **Step 3: 实现仲裁**

仲裁创建后订单进入 `disputed`。后台可记录双方陈述、证据、专家意见和最终裁决；裁决结果只能是继续履约、验收结算或全额退款。

- [x] **Step 4: 实现评价**

只有 `completed` 订单双方可各提交一次评价；公开开发者评分只统计可公开评价。

- [x] **Step 5: 验证和提交**

```bash
pnpm vitest run tests/unit/refunds/policy.test.ts tests/integration/orders/acceptance.test.ts
git add app lib tests
git commit -m "feat: add acceptance reviews refunds and disputes"
```

### Task 12: 站内通知和外部通知适配器

**Files:**
- Create: `lib/notifications/types.ts`
- Create: `lib/notifications/service.ts`
- Create: `lib/notifications/email.ts`
- Create: `lib/notifications/sms.ts`
- Create: `app/(workspace)/workspace/notifications/page.tsx`
- Test: `tests/unit/notifications/service.test.ts`

- [x] **Step 1: 写通知去重测试**

同一业务事件和接收者只能生成一条通知；邮件或短信失败不得回滚订单事务。

- [x] **Step 2: 实现事件通知**

覆盖需求审核、报价、中标、支付、留言、交付、验收、退款、仲裁和分账。站内通知必发；短信和邮件按事件配置。

- [x] **Step 3: 验证和提交**

```bash
pnpm vitest run tests/unit/notifications/service.test.ts
git add app lib tests
git commit -m "feat: add reliable marketplace notifications"
```

### Task 13: 第一阶段运营后台

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/developers/page.tsx`
- Create: `app/admin/demands/page.tsx`
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/disputes/page.tsx`
- Create: `app/admin/risk/page.tsx`
- Create: `app/admin/audit/page.tsx`
- Create: `lib/security/audit.ts`
- Test: `tests/e2e/admin.spec.ts`

- [x] **Step 1: 写管理员越权 E2E 测试**

普通客户和开发者访问 `/admin` 必须得到 403 或重定向；管理员操作必须新增审计日志。

- [x] **Step 2: 实现审核中心**

开发者和需求审核必须填写通过备注或拒绝原因；后台展示资料版本和历史操作。

- [x] **Step 3: 实现订单和争议中心**

后台可查看订单时间线、模拟支付单、证据和日志，并处理审核与仲裁。真实退款、分账和支付对账页面在 Task 18 使用真实渠道模型实现，避免第一期制作无法验证的空壳后台。高风险操作需要二次确认并填写原因。

- [x] **Step 4: 实现第一期风控基础**

支持封禁用户、暂停需求、冻结订单操作、标记异常支付。冻结只阻止后续动作，不修改历史财务记录。

- [x] **Step 5: 验证和提交**

```bash
pnpm playwright test tests/e2e/admin.spec.ts
git add app/admin lib/security tests/e2e/admin.spec.ts
git commit -m "feat: add marketplace operations console"
```

### Task 14: 第一阶段安全、可观测性与上线验收

**Files:**
- Create: `middleware.ts`
- Create: `lib/security/rate-limit.ts`
- Create: `lib/security/idempotency.ts`
- Create: `lib/observability/logger.ts`
- Create: `tests/e2e/customer-flow.spec.ts`
- Create: `tests/e2e/developer-flow.spec.ts`
- Create: `tests/e2e/dispute-flow.spec.ts`
- Modify: `OPERATIONS.md`

- [ ] **Step 1: 实施安全控制**

对验证码、登录、报价、留言、上传、支付和仲裁接口限流；所有写操作校验 Origin/CSRF 策略；安全日志不得记录验证码、密钥或文件签名 URL。

- [ ] **Step 2: 写三条完整 E2E 流程**

1. 客户发布需求、管理员审核、开发者报价、客户选标并模拟付款。
2. 开发者留言、上传文件、正式交付，客户验收并评价。
3. 客户拒绝验收、申请仲裁、管理员裁决全额退款。

- [ ] **Step 3: 做无障碍和响应式检查**

Run:

```bash
pnpm playwright test
pnpm verify
```

Expected: 所有测试通过；手机与桌面主流程无阻塞；构建成功。

- [ ] **Step 4: 更新运营手册**

`OPERATIONS.md` 写明每日审核、异常订单、投诉、退款、证据保全、数据删除和支付能力未上线时的宣传限制。

- [ ] **Step 5: 提交第一阶段**

```bash
git add .
git commit -m "chore: harden and verify marketplace phase one"
```

## 第二阶段：微信支付资金闭环

### Task 15: 冻结微信支付产品合同与生产字段

**Files:**
- Create: `docs/payments/wechat-application-checklist.md`
- Create: `docs/payments/funds-flow.md`
- Create: `docs/payments/refund-dispute-policy.md`

- [ ] **Step 1: 整理申请材料**

清单必须包含：

- 公司主体和法定代表人资料
- 域名、ICP备案及网站可访问状态
- 平台服务协议、隐私政策、交易和退款规则
- 客户、平台、开发者的业务关系说明
- 资金流、信息流和订单流图
- 开发者二级商户入驻和实名审核流程
- 平台佣金和分账规则
- 客服、投诉和争议处理渠道

- [ ] **Step 2: 将 Task 0 的产品结论落实为生产合同**

取得书面或后台可追溯确认：

- 当前软件开发撮合业务是否准入。
- 二级商户主体要求。
- 支付后可分账时点。
- 未分账退款与已分账退款规则。
- 平台佣金、手续费和结算周期。
- API 权限、证书和生产验收要求。

- [ ] **Step 3: 建立第二期启动闸门**

以下任一项缺失，Task 16–19 保持阻塞：

```text
业务类目已批准
平台商户号和所需产品权限已开通
二级商户进件接口和字段版本已确认
支付、退款、分账和账单 API 权限已开通
生产证书、API v3 密钥和回调域名准备完成
```

申请结论必须写入文档，不能用口头假设替代接口设计。

```bash
git add docs/payments
git commit -m "docs: define wechat pay onboarding and funds flow"
```

### Task 16: 实现微信二级商户入驻

**Files:**
- Create: `lib/payments/wechat/client.ts`
- Create: `lib/payments/wechat/onboarding.ts`
- Create: `app/api/wechat/onboarding/route.ts`
- Create: `app/api/wechat/onboarding/notify/route.ts`
- Create: `app/(workspace)/workspace/developer/payment-account/page.tsx`
- Test: `tests/integration/payments/wechat-onboarding.test.ts`

- [ ] **Step 1: 写签名、加密和状态测试**

使用固定官方测试向量或脱敏夹具验证请求签名、敏感字段加密、回调验签及重复通知。

- [ ] **Step 2: 实现入驻状态**

状态固定为 `not_started → submitting → reviewing → approved/rejected`。只有 `approved` 的开发者可以进入真实支付订单。

- [ ] **Step 3: 实现资料最小化**

身份证件、银行卡等敏感资料优先直接提交微信接口；平台数据库只保留必要状态、渠道申请号和脱敏摘要。

- [ ] **Step 4: 验证和提交**

```bash
pnpm vitest run tests/integration/payments/wechat-onboarding.test.ts
git add app lib tests
git commit -m "feat: add wechat sub-merchant onboarding"
```

### Task 17: 实现微信全额支付与可靠回调

**Files:**
- Create: `lib/payments/wechat/provider.ts`
- Create: `lib/payments/wechat/signature.ts`
- Create: `app/api/wechat/payments/notify/route.ts`
- Create: `app/api/jobs/payment-recovery/route.ts`
- Test: `tests/unit/payments/wechat-signature.test.ts`
- Test: `tests/integration/payments/wechat-payment.test.ts`

- [ ] **Step 1: 写支付异常测试**

覆盖：创建支付、重复创建、回调重复、回调乱序、验签失败、支付成功但本地事务失败、主动查单恢复。

- [ ] **Step 2: 实现生产支付适配器**

`PAYMENT_PROVIDER=wechat` 时使用微信实现；订单金额、描述、商户号、通知地址全部由服务端生成。

- [ ] **Step 3: 实现回调和恢复任务**

回调先验签，再按渠道交易号和事件 ID 幂等处理。恢复任务查询长时间处于待确认状态的支付单并修正订单。

- [ ] **Step 4: 验证和提交**

```bash
pnpm vitest run tests/unit/payments/wechat-signature.test.ts tests/integration/payments/wechat-payment.test.ts
git add app lib tests
git commit -m "feat: add wechat checkout and payment recovery"
```

### Task 18: 实现全额退款、单次分账与对账

**Files:**
- Create: `lib/payments/wechat/refunds.ts`
- Create: `lib/payments/wechat/profit-sharing.ts`
- Create: `lib/payments/reconciliation.ts`
- Create: `app/api/wechat/refunds/notify/route.ts`
- Create: `app/api/jobs/profit-share/route.ts`
- Create: `app/api/jobs/reconcile/route.ts`
- Create: `app/admin/payments/page.tsx`
- Create: `app/admin/refunds/page.tsx`
- Create: `app/admin/profit-shares/page.tsx`
- Create: `app/admin/reconciliation/page.tsx`
- Test: `tests/integration/payments/refund.test.ts`
- Test: `tests/integration/payments/profit-share.test.ts`
- Test: `tests/integration/payments/reconciliation.test.ts`

- [ ] **Step 1: 写财务不变量测试**

必须始终满足：

```text
developer_receivable_cents + platform_gross_commission_cents = paid_amount_cents
platform_net_revenue_cents = platform_gross_commission_cents
                             - payment_channel_fee_cents
                             - profit_share_fee_cents
refund_amount_cents = paid_amount_cents
profit_share 只能从 accepted/share_failed 发起
同一订单只能有一条成功分账
```

- `payment_channel_fee_cents` 和 `profit_share_fee_cents` 必须独立落账，不得从开发者应收中临时扣减。
- 渠道费用账单尚未返回时，平台净收入标记为暂估；对账完成后写入实际费用。
- 佣金金额采用整数分和明确舍入规则：`floor(paid_amount_cents * commission_bps / 10000)`。

- [ ] **Step 2: 实现全额退款**

退款请求由管理员审核或仲裁裁决触发；重复请求返回同一退款记录；渠道状态通过回调和主动查询更新。渠道失败时记录标准化错误码，退款记录进入 `failed`，订单回到 `refund_review`；重试创建新的渠道尝试记录，但复用平台退款业务号并使用新的明确幂等键。

- [ ] **Step 3: 实现单次分账**

验收后创建分账。开发者应收为实付金额减平台毛佣金；支付通道费和分账费由平台承担并单独记账。分账失败进入 `share_failed`，保留失败原因并允许幂等重试。

- [ ] **Step 4: 实现日对账**

每日下载渠道账单，与 `payments`、`refunds`、`profit_shares` 比较，生成缺失、金额不一致、状态不一致和渠道费用不一致四类差异。同步完成支付、退款、分账和对账后台页面。

- [ ] **Step 5: 验证和提交**

```bash
pnpm vitest run tests/integration/payments/refund.test.ts tests/integration/payments/profit-share.test.ts tests/integration/payments/reconciliation.test.ts
git add app lib tests
git commit -m "feat: add refunds profit sharing and reconciliation"
```

### Task 19: 生产支付验收与正式上线

**Files:**
- Create: `docs/payments/production-acceptance.md`
- Modify: `OPERATIONS.md`
- Modify: `.env.example`
- Test: `tests/e2e/payment-production-smoke.spec.ts`

- [ ] **Step 1: 在微信测试/验收环境执行场景矩阵**

逐项记录订单号和结果：

- 正常付款
- 用户取消付款
- 待付款超时关闭
- 重复支付回调
- 延迟回调
- 主动查单恢复
- 全额退款
- 退款失败后人工重试
- 分账成功
- 分账失败后重试
- 对账一致

- [ ] **Step 2: 生产小额烟雾测试**

使用受控真实客户和开发者二级商户完成一笔小额订单。核对客户端页面、平台订单、微信账单、开发者结算和平台佣金。

- [ ] **Step 3: 运行最终验证**

Run:

```bash
pnpm verify
pnpm playwright test
```

Expected: 全部通过；支付验收文档无未解决高风险项。

- [ ] **Step 4: 启用生产支付**

将生产环境 `PAYMENT_PROVIDER` 从 `mock` 改为 `wechat`。确认监控、告警、客服和每日对账负责人已就位后再开放真实付款入口。

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "chore: complete production payment acceptance"
```

## 最终验收清单

- [ ] 同一账号可使用手机号或邮箱登录并切换客户/开发者角色。
- [ ] 只有认证开发者可以报价和接收真实支付订单。
- [ ] 需求、报价、选标和订单创建具备并发保护。
- [ ] 客户只进行单笔全额付款。
- [ ] 订单支持留言、私有文件、正式交付、拒绝验收和重新交付。
- [ ] 验收后只进行一次分账。
- [ ] 首版退款只支持全额退款。
- [ ] 支付、退款和分账回调均验签、幂等并可主动恢复。
- [ ] 退款失败会回到人工审核，分账失败可安全重试，不产生重复资金操作。
- [ ] 平台没有余额、充值或自行提现功能。
- [ ] 管理后台覆盖审核、订单、支付、退款、分账、仲裁、风控和日志。
- [ ] 服务协议、隐私、交易、退款和争议规则已上线。
- [ ] 三条角色主流程通过端到端测试。
- [ ] 每日对账能发现并呈现差异。
- [ ] 支付通道费和分账费独立记账，开发者应收不因渠道费用临时变化。
- [ ] 中国大陆部署、备案、手机号 OTP 和微信支付准入均有可追溯验证结论。
- [ ] 未取得微信支付对应能力前，不宣传资金托管或担保交易。
