# 码上好 AI 开发交易平台阶段工作报告

> ⚠️ 本报告已过期（范围仅到 Task 8），已被 `docs/reports/2026-06-17-marketplace-progress-report.md` 取代。请以新报告为准。

报告日期：2026-06-16
项目路径：`/Users/yangchao/Desktop/mahcod-website`
当前分支：`feature/marketplace-platform`
当前最新提交：`ad0b85b feat: add quotes and transactional order creation`
报告范围：从静态原型基线到 Task 8 报价、选标与订单生成

## 1. 总体进度

目前项目已经从原始静态页面升级为一个可本地运行、具备真实业务骨架的 Next.js 交易平台。已完成公开网站、认证、双角色工作台、数据库模型、RLS 权限、开发者入驻、需求发布、需求市场筛选、报价、并发选标和待支付订单生成。

按实施计划看，当前已完成：

- Task 0：可行性与架构前置文档，部分外部验证项仍待真实测试。
- Task 1：Next.js 工程初始化。
- Task 2：设计系统与三类布局。
- Task 3：核心数据库模型和 RLS。
- Task 4：手机号、邮箱登录与双角色账号。
- Task 5：公开网站迁移与合规页面。
- Task 6：开发者认证、作品和公开资料。
- Task 7：需求发布、审核和市场筛选。
- Task 8：报价、选标与订单生成。

下一步应进入 Task 9：支付适配器和模拟全额付款。

## 2. 当前提交记录

| 提交 | 说明 |
|---|---|
| `ddb0ce0` | 捕获静态原型基线 |
| `b67d00e` | 记录市场可行性发现 |
| `6838d78` | 记录域名所有权证据 |
| `2bb033e` | 初始化 Next.js 市场应用 |
| `8763e02` | 忽略 TypeScript 构建缓存 |
| `6ffaf3f` | 增加设计系统和布局 |
| `1e5d08a` | 增加市场数据库 schema 和 RLS |
| `cef0e8a` | 增加 OTP 认证和角色切换 |
| `e364785` | 迁移公开市场页面 |
| `909676c` | 修复审查阻塞项 |
| `cb53c7d` | 增加开发者入驻和资料 |
| `ef6aed2` | 增加需求发布和市场筛选 |
| `ad0b85b` | 增加报价和事务化订单生成 |

当前工作树只剩 `docs/reviews/` 未跟踪，这是审查师报告目录，未纳入功能提交。

## 3. 工程基础

项目已建立完整 Next.js + TypeScript 工程结构：

- `app/`：Next.js App Router 页面与 API。
- `components/`：UI、营销页、工作台、后台壳组件。
- `lib/`：认证、数据库类型、领域服务、存储工具。
- `supabase/`：本地数据库配置、迁移和 seed。
- `tests/`：单元测试、集成测试和 E2E 测试。
- `legacy/`：保留原始静态原型文件。

已配置主要脚本：

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## 4. 设计系统与布局

已完成三类界面布局：

- 公开营销站布局。
- 用户工作台布局。
- 运营后台壳布局。

已实现基础 UI：

- `Button`
- `Card`
- `StatusBadge`
- 公开站 Header/Footer
- 工作台侧边导航
- 后台导航壳

视觉方向保留了现有品牌感：暖白、珊瑚橙、青绿色；工作台和后台采用白色、浅灰、细边框与少量品牌色，更适合长期业务操作。

## 5. 数据库与权限基础

已建立 Supabase/PostgreSQL 核心模型：

- 账号与角色：`profiles`、`user_roles`、`developer_profiles`
- 需求与报价：`demands`、`demand_attachments`、`quotes`
- 订单与履约：`orders`、`order_messages`、`order_attachments`、`deliveries`
- 治理与资金：`payments`、`refunds`、`profit_shares`、`disputes`、`reviews`
- 审计与历史：`order_status_history`、补单关系和相关治理表

已建立关键枚举：

- `app_role`
- `review_status`
- `demand_status`
- `quote_status`
- `order_status`

已完成 RLS 权限基础：

- 公开用户只能读取已发布需求和已审核开发者。
- 客户只能管理自己的需求。
- 开发者只能管理自己的报价。
- 订单参与方只能读取自己的订单、消息和附件元数据。
- 支付、退款、分账等金融表不开放普通用户写入。
- 关键状态变更通过服务端 RPC 执行。

## 6. 认证与双角色账号

已实现：

- 邮箱 Magic Link 登录。
- 手机号 OTP 登录。
- `/auth/callback` 回调。
- `/login` 登录页。
- `/verify` 手机验证码页。
- 工作台角色切换。
- `customer` / `developer` 双角色模型。
- 当前工作台角色保存到安全 cookie。
- 服务端每次读取 cookie 后都会验证用户确实拥有该角色。

审查师曾指出的 P0 已修复：

1. 邮箱和手机号同一账号 E2E 失败。
2. 公开 CTA 指向不存在的 `/workspace/customer/demands/new`。

修复后：

- 认证测试会清理固定测试手机号和旧测试账号。
- 新增 `/workspace/customer/demands/new`。
- E2E 覆盖登录后进入发布需求页并提交需求审核。
- 当前全量 Playwright 通过。

## 7. 公开网站迁移

已从静态原型迁移为 Next.js 页面：

- `/`
- `/demands`
- `/demands/[id]`
- `/developers`
- `/developers/[id]`
- `/rules/service`
- `/rules/privacy`
- `/rules/trading`
- `/rules/disputes`

已移除或替换：

- 虚构成交数字。
- 虚构好评率。
- “资金托管”等尚未具备能力的承诺。
- “保证退款”等尚未具备能力的承诺。
- “30 天售后”等未验证承诺。
- 无效 `alert()` 演示逻辑。

已新增：

- 动态 `robots.ts`。
- 动态 `sitemap.ts`。
- 页面 metadata 和 canonical。
- 移动端导航。
- 公开页面 E2E。

## 8. 开发者入驻与资料

已完成开发者认证申请流程。

页面：

- `/workspace/developer/apply`
- `/workspace/developer/profile`

API：

- `POST /api/developers/apply`

领域服务：

- `lib/domain/developers/schema.ts`
- `lib/domain/developers/service.ts`

支持字段：

- 姓名或品牌名。
- 城市。
- 简介。
- 技能。
- 服务范围。
- 起步价。
- 作品标题。
- 作品说明。
- 作品链接。
- 作品图片链接。
- 联系方式。
- 收款主体类型。
- 收款主体名称。

审核状态：

```text
draft -> pending -> approved/rejected
```

已实现：

- 未审核资料不公开。
- 重复提交更新同一资料，不创建重复记录。
- 被拒绝后可重新提交。
- 公开开发者市场只展示 `approved`。

## 9. 需求发布、审核与市场筛选

已完成需求生命周期：

```text
draft -> pending_review -> published -> matched/closed
```

页面：

- `/workspace/customer/demands/new`
- `/demands`
- `/demands/[id]`

API：

- `POST /api/demands`

领域服务：

- `lib/domain/demands/schema.ts`
- `lib/domain/demands/service.ts`

需求字段：

- 标题。
- 项目类型。
- 详细描述。
- 预算下限。
- 预算上限。
- 期望周期。
- 合作方式。
- 附件元数据入口。

市场筛选支持：

- 项目类型。
- 预算。
- 周期。
- 关键词。
- 发布时间。

筛选写入 URL 参数，页面刷新后保持。

已收紧权限：

- 已发布需求不能被客户绕过服务层修改核心范围。
- 客户仍可关闭自己已发布或已匹配需求。

## 10. 报价、选标与订单生成

已完成报价和选标第一版交易核心。

页面：

- `/workspace/developer/quotes`
- `/workspace/customer/demands/[id]/quotes`

API：

- `POST /api/demands/[id]/quotes`
- `POST /api/quotes/[id]/select`

领域服务：

- `lib/domain/quotes/service.ts`
- `lib/domain/orders/events.ts`
- `lib/domain/orders/state-machine.ts`

报价规则：

- 仅 `approved` 开发者可报价。
- 同一开发者对同一需求只能有一份有效报价。
- 报价包含金额、工期、方案、有效期。
- 客户不能选择自己的开发者身份提交的报价。

事务化选标由数据库 RPC `select_quote_for_order` 完成：

1. 锁定报价。
2. 锁定需求。
3. 验证需求仍为 `published`。
4. 验证报价仍为 `active`。
5. 标记选中报价为 `selected`。
6. 拒绝同需求其他 active 报价。
7. 创建 `pending_payment` 订单。
8. 固化订单金额、开发者、客户和佣金率。
9. 将需求改为 `matched`。

已写并发测试，验证两份报价并发选择时只会生成一个订单。

订单状态机已实现：

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

非法状态组合会抛出 `Invalid order transition`。

## 11. 测试与验证情况

最近完成 Task 8 后通过的验证：

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

结果：

- ESLint 通过。
- TypeScript 通过。
- Vitest 默认套件通过。
- Next build 通过。

数据库集成测试：

```bash
pnpm vitest run \
  tests/integration/database/rls.test.ts \
  tests/integration/developers/apply.test.ts \
  tests/integration/demands/lifecycle.test.ts \
  tests/integration/quotes/select.test.ts
```

结果：

```text
4 test files passed
16 tests passed
```

E2E 测试：

```bash
pnpm playwright test
```

结果：

```text
10 passed
```

当前测试覆盖包括：

- 状态徽标。
- 布局壳组件。
- 权限守卫。
- 数据库 RLS。
- 开发者申请。
- 需求生命周期。
- 报价与并发选标。
- 订单状态机。
- 公开页面访问。
- 邮箱/手机同账号登录。
- 发布需求入口。

## 12. 当前尚未完成内容

虽然基础交易链条已经推进到“报价 -> 选标 -> 生成待支付订单”，但还不能称为完整可上线 MVP。

尚未完成：

- Task 9：支付适配器和模拟全额付款。
- Task 10：订单留言、附件和交付。
- Task 11：验收、评价、退款和争议。
- Task 12：通知与运营后台。
- Task 13：安全加固、速率限制、审计。
- Task 14：第一期上线清单。
- 第二阶段微信支付、分账、退款、对账等真实资金闭环。

外部条件仍需确认：

- 阿里云服务器部署方案。
- ICP 备案。
- 国内短信服务商。
- 邮箱到达率。
- 微信支付准入。
- 二级商户和分账规则。

## 13. 当前技术状态

当前项目已经具备：

- 可运行的 Next.js 应用。
- 本地 Supabase 数据库。
- 本地 RLS 集成测试。
- 公开站。
- 登录注册。
- 双角色工作台。
- 开发者入驻。
- 需求发布。
- 公开需求市场。
- 报价。
- 客户选标。
- 订单生成。
- 状态机基础。

当前还不具备：

- 真实付款。
- 模拟付款确认。
- 履约沟通。
- 文件上传闭环。
- 交付验收。
- 平台退款仲裁。
- 运营后台审核。
- 正式部署和备案能力。

## 14. 下一步建议

建议继续 Task 9：支付适配器和模拟全额付款。

目标是把当前 `pending_payment` 订单推进到可模拟支付的状态：

- 定义 `PaymentProvider`。
- 实现 `MockPaymentProvider`。
- 新增 `/api/orders/[id]/pay`。
- 新增 `/api/payments/mock/confirm`。
- 创建支付记录。
- 模拟支付成功后推动订单状态：

```text
pending_payment -> in_progress
```

完成 Task 9 后，平台才会具备第一版“全额付款模式”的本地闭环基础。
