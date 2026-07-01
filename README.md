# 码上好 AI 开发者服务平台

码上好是一个面向 AI 应用开发需求的撮合与交付平台。当前代码库已经从早期静态 HTML 原型升级为 Next.js + Supabase 的全栈应用，支持需求发布、开发者入驻、报价、订单协作、模拟全额付款、交付、验收、评价、后台审核与风控治理等第一阶段核心流程。

## 当前状态

- 生产域名：`https://www.mshcode.com`
- 部署形态：腾讯云服务器运行 Next.js，Supabase 托管 Auth / PostgreSQL / Storage
- 数据库：Supabase PostgreSQL，迁移文件位于 `supabase/migrations/`
- 支付：当前必须保持 `PAYMENT_PROVIDER=mock`，仅用于模拟全额付款流程
- 真实资金：微信支付、退款、分账、对账尚未接入，不得对外宣传为真实资金托管或担保交易
- 生产烟测：核心 mock 交易链路已通过一次生产烟测并完成清理；产品购买、数字员工需求已补充本地 E2E 覆盖；文件、通知、真实支付仍需继续补充生产验收

## 技术栈

- Next.js `16.2.9`
- React `19`
- TypeScript
- Supabase JS / SSR
- PostgreSQL + RLS + RPC
- Tailwind CSS
- Vitest
- Playwright
- 腾讯云 + Nginx + PM2

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `app/` | Next.js App Router 页面、API routes、workspace/admin 路由 |
| `lib/domain/` | 领域服务、查询服务、表单解析、业务规则 |
| `lib/db/types.ts` | Supabase 数据库类型，需随 schema 同步 |
| `supabase/migrations/` | 数据库迁移、RLS、RPC、约束 |
| `tests/unit/` | 领域服务与组件单元测试 |
| `tests/integration/` | Supabase/RPC 集成测试，缺少本地 env 时会按既有规则 skip |
| `tests/e2e/` | Playwright E2E |
| `docs/deployment/` | 腾讯云、生产环境、烟测部署说明 |
| `docs/reviews/` | 审查记录 |
| `docs/agent-handoffs/` | Codex / Claude 协作交接记录 |

## 本地开发

安装依赖：

```bash
pnpm install
```

启动本地 Supabase：

```bash
pnpm exec supabase start
```

启动 Next.js：

```bash
pnpm dev
```

常用检查：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

一键验证：

```bash
pnpm verify
```

注意：在受限沙箱内，Next.js Turbopack build 可能因为本地端口绑定权限失败；在正常终端或提升权限环境下重新运行 `pnpm build` 即可确认构建。

## 数据库迁移与类型

迁移文件是数据库结构的源头：

```bash
supabase/migrations/*.sql
```

应用新增字段、约束、RLS、RPC 时，应同时：

1. 新增迁移文件。
2. 本地应用迁移并确认 `supabase_migrations.schema_migrations` 记录一致。
3. 同步 `lib/db/types.ts`。
4. 运行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`。

当前本机 Supabase CLI `gen types --local` 在未登录 Supabase access token 时会报 `LegacyPlatformAuthRequiredError`。可用本地 `pg-meta` 生成类型作为替代路径，前提是本地 Supabase 已启动：

```bash
docker exec supabase_pg_meta_mahcod-website node -e "(
  async () => {
    const r = await fetch('http://127.0.0.1:8080/generators/typescript?included_schemas=public')
    process.stdout.write(await r.text())
  }
)()" > lib/db/types.ts
```

生成后如文件末尾出现多余空行，可运行：

```bash
perl -0pi -e 's/\n\z//' lib/db/types.ts
```

## 生产部署要点

腾讯云部署说明见：

- `docs/deployment/tencent-cloud-preflight.md`
- `docs/deployment/tencent-cloud-server-init.md`

生产环境必须配置：

```bash
NEXT_PUBLIC_APP_URL=https://www.mshcode.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=mock
ORDER_FILE_MAX_BYTES=52428800
```

安全边界：

- `SUPABASE_SERVICE_ROLE_KEY` 只能放服务器环境变量，不得提交到仓库。
- 当前阶段不要设置 `PAYMENT_PROVIDER=wechat`。
- 不要把 mock 支付描述成真实扣款、资金托管或担保交易。
- 生产数据库迁移需要通过正式 Supabase 迁移流程或 SQL Editor 明确执行，代码推送不会自动改变数据库结构。

## 已知待办

- 将最新迁移应用到生产 Supabase 数据库，至少包括：
  - `202607010001_allow_digital_employee_demands.sql`
  - `202607010002_grant_product_admin_service_role.sql`
- 在生产环境复核数字员工需求发布、产品上架审核、产品购买与交付内容查看。
- 更新生产运维 runbook 和告警/健康检查。
- 真实微信支付、退款、分账、对账在商户准入完成前保持 blocked。
