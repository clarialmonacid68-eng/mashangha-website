# 码上好（mahcod）AI 开发交易平台 — 项目说明文档

> 本文件面向「接手本项目的 AI 协作者 / 工程师」。读完即可立刻理解：这是什么项目、做到哪一步、代码长什么样、怎么跑起来、有哪些重要约束。
>
> 维护提示：本文件描述的是 **2026-06-17 HEAD（提交 `b2fa9b5 feat: close phase one review gaps`，分支 `feature/marketplace-platform`）** 的状态。改动较大时请同步更新本文件。

---

## 1. 一句话定位

**码上好** 是一个面向中国大陆市场的「AI 开发者 × 需求方」撮合交易平台：客户发布软件/AI 开发需求，认证开发者报价，客户选标后下单、付款、协作交付、验收、评价；平台提供审核后台、争议仲裁和（未来的）资金托管与分账。

线上演示站：`https://www.mshcode.com/`（当前部署在 Vercel，新加坡 `sin1` 区域）。

**当前真实状态（务必诚实对外表述）**：项目处于「**第一阶段：本地可验证的交易闭环雏形**」。完整的业务流程骨架（认证 → 需求 → 报价 → 选标 → 模拟付款 → 交付 → 验收 → 评价 → 争议）已能在本地跑通并通过测试，但 **真实微信支付、真实退款、真实分账、对账、生产部署/ICP 备案都尚未完成**。对外宣传 **不得** 声称「资金托管 / 担保交易 / 保证退款 / 自动分账」。

---

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS v4 |
| 后端/数据库 | Supabase（PostgreSQL + Auth + Storage），本地用 Supabase CLI |
| 表单/校验 | React Hook Form + Zod |
| 认证 | 邮箱 Magic Link + 手机号 OTP，双角色（customer / developer） |
| 支付 | 渠道无关的 `PaymentProvider` 适配器，当前为 `MockPaymentProvider`；第二阶段接微信支付 API v3 |
| 测试 | Vitest（单元/集成）+ Testing Library + Playwright（E2E/流程） |
| 包管理 | pnpm |
| 部署 | Vercel（临时，未锁定；生产方案待大陆网络实测与备案决定） |

---

## 3. 目录结构地图

```text
app/                         # Next.js App Router：页面 + API
  (marketing)/               # 公开站：首页、需求市场、开发者、规则页
  (auth)/                    # 登录 /login、验证码 /verify
  (workspace)/workspace/     # 登录后双角色工作台（客户 + 开发者 + 订单/争议/通知/设置）
  admin/                     # 运营后台：开发者/需求审核、订单、争议、风控、审计
  api/                       # 写接口路由（需求、报价、订单、支付、文件签名等）
  auth/callback/             # 认证回调
components/
  marketing/ workspace/ admin/ ui/   # 三类布局壳 + 基础 UI（Button/Card/StatusBadge）
lib/
  auth/                      # 客户端/服务端认证、角色守卫 guards.ts
  db/types.ts                # 数据库类型
  domain/                    # 领域服务（核心业务逻辑所在）
    demands/ developers/ quotes/ orders/ disputes/ refunds/
  payments/                  # 支付适配器：provider.ts / mock-provider.ts / service.ts
  notifications/             # 站内通知：repository / service / email / sms
  security/                  # audit 审计、idempotency 幂等、rate-limit 限流
  storage/                   # 文件存储与访问策略
  observability/logger.ts    # 日志（含脱敏）
supabase/
  migrations/                # 14 个迁移文件（schema + RLS + RPC），按时间命名
  seed.sql                   # 种子数据
tests/
  unit/ integration/ e2e/    # 测试三层
legacy/                      # 原始 6 页静态原型（保留参考，已被 Next.js 版替代）
docs/                        # 全部设计/审查/计划/可行性文档（见第 8 节）
proxy.ts                     # 中间件：写接口的 CSRF/Origin 检查 + 内存限流
商标和头像/                   # 品牌 logo / icon 资源
```

**关键约定**：核心业务逻辑写在 `lib/domain/*/service.ts`，API 路由和页面是薄壳；敏感状态变更（如选标、支付）通过数据库 RPC 事务完成，不在应用层拼装。

---

## 4. 核心数据模型（Supabase / PostgreSQL）

主要表（定义见 `supabase/migrations/`）：

- 账号与角色：`profiles`、`user_roles`、`developer_profiles`、`developer_applications`
- 需求与报价：`demands`、`demand_attachments`、`quotes`
- 订单与履约：`orders`、`order_messages`、`order_attachments`、`deliveries`
- 治理与资金：`payments`、`refunds`、`profit_shares`、`disputes`、`reviews`
- 审计与历史：`order_status_history`、通知表 `notifications`、审计日志

关键枚举：`app_role`、`review_status`、`demand_status`、`quote_status`、`order_status`。

**权限（RLS）核心规则**：公开用户只读「已发布需求 + 已审核开发者」；客户只能管自己的需求；开发者只能管自己的报价；订单参与方只能读自己的订单/消息/附件；支付/退款/分账等金融表 **不开放普通用户写入**，只能通过服务端 RPC 改动。

---

## 5. 关键业务流与状态机

**需求生命周期**：`draft → pending_review → published → matched / closed`

**开发者资料**：`draft → pending → approved / rejected`（未审核不公开，被拒可重提）

**选标（事务化 RPC `select_quote_for_order`）**：锁报价 → 锁需求 → 校验仍 published/active → 标记选中 → 拒绝同需求其他报价 → 创建 `pending_payment` 订单 → 固化金额/双方/佣金率 → 需求改为 `matched`。已有并发测试保证两份报价并发选标只会生成一个订单。

**订单状态机**（`lib/domain/orders/state-machine.ts`，非法转移会抛 `Invalid order transition`）：

```text
pending_payment + payment_succeeded   -> in_progress
pending_payment + payment_expired     -> closed
in_progress     + deliver             -> delivered
delivered       + accept_delivery     -> accepted
delivered       + reject_delivery     -> in_progress
*               + open_dispute        -> disputed
disputed        + resolve_continue    -> in_progress
disputed        + resolve_accept      -> accepted
*               + approve_refund      -> refund_review
refund_review   + refund_started      -> refunding
refunding       + refund_succeeded    -> refunded
refunding       + refund_failed       -> refund_review
accepted        + profit_share_started-> sharing
sharing         + profit_share_succeeded -> completed
sharing         + profit_share_failed -> share_failed
share_failed    + retry_profit_share  -> sharing
```

「验收后评价」目前通过 **本地模拟结算** `completeAcceptedOrderWithMockSettlement()` 把 `accepted → completed`，再开放评价（非真实分账）。

---

## 6. 已完成 vs 未完成（诚实清单）

### ✅ 已完成（本地可验证）

- Next.js + TS 工程、设计系统、三类布局壳
- Supabase 核心 schema、RLS、关键 RPC
- 邮箱 Magic Link + 手机 OTP 登录、双角色切换
- 公开站迁移、规则页、动态 `sitemap.ts` / `robots.ts`、移动端导航
- 开发者入驻申请与审核
- 需求发布、审核、市场筛选（筛选写入 URL 参数）
- 报价、客户选标、事务化订单创建（含并发保护）
- 模拟支付：创建支付单 + 页面「确认模拟支付」按钮 + 服务层确认 → `in_progress`
- 订单留言、附件元数据、正式交付、验收/拒收、评价
- 争议发起、全额退款裁决状态推进
- 模拟结算完成路径（`accepted → completed`）
- 站内通知 Supabase 持久化 + 关键业务事件写通知
- 运营后台初版：开发者/需求审核（含审计）、订单/争议/风控/审计查看
- 安全基础：写接口 Origin/CSRF 拦截、内存限流、幂等工具、日志脱敏
- 微信支付申请材料 / 资金流 / 退款争议政策 / 安全骨架设计文档

### ⛔ 未完成 / 被阻塞（blocked）

- **真实微信支付**：下单、回调、退款、分账、对账（第二阶段 Task 15–19，等待商户准入书面确认）
- 二级商户真实进件与收款账户
- 真实文件上传到 Supabase Storage + 短时签名链接闭环
- 真正逐页点击式 UI E2E（当前部分 E2E 是「Playwright runner 内直接调服务层」的流程测试，非完整 UI 点击）
- 运营后台真实高风险动作：封禁用户、暂停需求、冻结订单、异常支付处理、退款执行/失败重试、支付/退款/分账/对账页面
- 生产部署锁定、ICP 备案、大陆三网网络实测、生产短信服务商报备、邮箱到达率验证
- 生产级风控、监控、告警、客服流程、数据留存策略落地

---

## 7. 如何运行与验证

```bash
pnpm install

# 本地开发
pnpm dev                    # http://localhost:3000

# 本地数据库（需 Supabase CLI + Docker）
pnpm exec supabase start
pnpm exec supabase db reset # 应用全部 migrations + seed
pnpm exec supabase status -o env   # 导出本地 Supabase 环境变量

# 验证（提交前必跑）
pnpm verify                 # = lint + typecheck + test + build
pnpm test                   # 默认 Vitest（会跳过依赖 Supabase env 的集成测试）
pnpm vitest run             # 导出 Supabase env 后跑全量（含集成测试）
pnpm test:e2e               # Playwright
```

**注意**：`pnpm test` / `pnpm verify` 默认会 **跳过** 需要 Supabase 环境变量的数据库集成测试。要完整验证，必须先 `supabase status -o env` 导出本地环境变量再 `pnpm vitest run`。

环境变量见 `.env.example`：Supabase URL/Key、`PAYMENT_PROVIDER=mock`、微信支付字段（当前留空）。

**最近一次完整验证结果（审查报告 2026-06-16）**：`pnpm verify` 通过；`supabase db reset` 通过；带 Supabase env 的 Vitest 16 文件 50 测试全过；Playwright 16 测试全过。

---

## 8. 重要文档索引（`docs/`）

| 文件 | 内容 |
|---|---|
| `superpowers/plans/2026-06-15-mahcod-marketplace-implementation.md` | **主实施计划**：Task 0–19 全量任务、交付节奏、目录设计 |
| `superpowers/plans/2026-06-17-phase-one-review-fixes.md` | 第一阶段审查修复计划（已完成） |
| `superpowers/specs/*` | 各阶段设计规格（市场设计、微信支付安全骨架、修复设计、社媒推广） |
| `reviews/2026-06-16-marketplace-platform-audit.md` | **最新工程审查报告**（诚实完成度判断 + 后续建议，必读） |
| `reports/2026-06-16-marketplace-progress-report.md` | 阶段进度报告（注意：内容停在 Task 8，已部分过期） |
| `feasibility/china-production-readiness.md` | 中国大陆生产可行性判定表（备案/短信/支付准入状态） |
| `architecture/production-hosting-decision.md` | 生产部署决策（Vercel/Supabase 候选，未锁定） |
| `auth/sms-provider-decision.md` | 短信服务商决策 |
| `payments/*` | 微信支付申请清单、资金流、退款争议政策、产品决策 |
| 根目录 `README.md` | 原静态原型部署指南（偏早期，部分已过时） |
| 根目录 `OPERATIONS.md` | **运营启动清单 + 第一阶段运营手册**（审核/争议/退款/数据删除规范，运营必读） |

---

## 9. 接手时的注意事项（给 AI 协作者）

1. **诚实口径优先**：任何对外文案、报告、销售话术，都必须区分「本地模拟 / 第一阶段验证中」与「真实资金能力」。真实支付未上线前，不得宣传资金托管、担保交易、保证退款、自动分账。
2. **改业务逻辑去 `lib/domain/`**，不要把逻辑塞进页面或 API 路由。
3. **敏感状态变更走数据库 RPC + 事务**，并补并发/幂等考虑。
4. **遵循 TDD**：本项目历史按「先写失败测试 → 实现 → 跑通」推进（见 superpowers 计划），改动请配套测试。
5. **金融表不开放普通用户写**，只能服务端改；动 RLS 要补 `tests/integration/database/rls.test.ts`。
6. **提交前跑 `pnpm verify`**；涉及数据库的改动要带 Supabase env 跑全量 Vitest。
7. 当前分支 `feature/marketplace-platform`，尚未合并主干。
8. 项目说明性文档（本文件、进度报告）容易过期，改大功能时请同步更新，并优先信任 **代码 + 最新审查报告**。

---

## 10. 下一步去哪看

- 想知道「现在该做什么」→ 读同目录 `NEXT_STEPS_PLAN.md`（后续工作计划）。
- 想知道「整体要做成什么」→ 读 `docs/superpowers/plans/2026-06-15-mahcod-marketplace-implementation.md`。
- 想知道「现在到底完成到哪、哪些不能吹」→ 读 `docs/reviews/2026-06-16-marketplace-platform-audit.md`。
