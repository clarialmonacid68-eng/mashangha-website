# Claude 交接给 Codex：后台只读列表查询下沉（第六轮）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-workspace-form-helpers-integration.md`

---

## 1. 完成范围

把后台四个列表页渲染层里直接的 `service.from(...).select(...)` 只读查询下沉到 `lib/domain/admin/queries.ts`，页面默认导出只剩「鉴权 + 调用 list 服务 + 渲染」。本轮聚焦写动作已下沉过的四个后台页，保持小颗粒。

- `admin/demands` → `listAdminDemands`
- `admin/products` → `listAdminProducts`
- `admin/orders` → `listAdminOrders`
- `admin/disputes` → `listAdminDisputes`

select 列、`order("created_at", desc)`、`limit(50)` 均与原查询逐项一致，结果集不变。

## 2. 本轮改动

- 新增 `lib/domain/admin/queries.ts`：四个 service-role 只读 list 服务（统一 `ADMIN_LIST_LIMIT = 50`，出错抛出，空数据返回 `[]`）。
- 四个 admin 页：删除内联查询，改为 `const xxx = await listAdminXxx(createServiceClient())`，并 import 对应函数。
- 四页的 `createServiceClient` import 仍被各自 server action 使用，保留。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/admin/queries.ts` | 新增（四个 list 服务） |
| `app/admin/demands/page.tsx` | 列表查询改调 `listAdminDemands`，新增 import |
| `app/admin/products/page.tsx` | 列表查询改调 `listAdminProducts`，新增 import |
| `app/admin/orders/page.tsx` | 列表查询改调 `listAdminOrders`，新增 import |
| `app/admin/disputes/page.tsx` | 列表查询改调 `listAdminDisputes`，新增 import |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/admin/queries.ts \
        app/admin/demands/page.tsx \
        app/admin/products/page.tsx \
        app/admin/orders/page.tsx \
        app/admin/disputes/page.tsx \
        docs/agent-handoffs/2026-06-26-claude-admin-list-queries-result.md
git commit -m "feat(domain): extract admin list queries into lib/domain/admin/queries"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint <四页 + queries.ts>` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. 四个后台列表页渲染结果与下沉前一致（同样的列、按创建时间倒序、最多 50 条）。
2. 四页的 server action（审核/裁决/冻结/退款/下架）不受影响，仍正常。
3. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
4. 可选补单测：list 服务出错时抛出、空结果返回 `[]`（需 Supabase env，可能仍 skip）。

## 8. 下一轮建议

- 后台剩余只读查询：`admin/risk`（profiles + payments 双查询）、`admin/developers`（列表 + 详情 + 审计）、`admin/audit`（审计列表）可作为下一轮同模式下沉到 `lib/domain/admin/queries.ts`。
- 工作台/公开页里仍直接 `.from(...)` 的渲染查询（如 `orders/[id]`、`purchases`、`notifications`、`settings`、`customer/demands`、`developer/quotes`、`marketing/developers`）可后续按模块分批下沉为各 domain 的 list/detail 服务，价值中等、纯读路径。
- 也可在任一节点转向真实支付前置（受外部准入约束、保持 blocked）。
