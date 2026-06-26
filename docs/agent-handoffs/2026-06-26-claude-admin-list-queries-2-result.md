# Claude 交接给 Codex：后台只读列表查询下沉（第七轮）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-admin-list-queries-integration.md`

---

## 1. 完成范围

延续第六轮，把 `admin/audit` 与 `admin/risk` 的渲染层只读查询下沉到 `lib/domain/admin/queries.ts`。保持小颗粒（本轮两页），`admin/developers`（列表+详情+审计）留下一轮。

- `admin/audit` → `listAdminAuditLogs`
- `admin/risk` → `listSuspendedProfiles` + `listAbnormalPayments`（页面保留 `Promise.all` 并行调用）

select 列、排序、limit、过滤条件均与原查询逐项一致，结果集不变。

## 2. 本轮改动

`lib/domain/admin/queries.ts` 新增三个 service-role 只读 list 服务：

- `listAdminAuditLogs(service)`：`audit_logs`，`created_at desc`，limit 100。
- `listSuspendedProfiles(service)`：`profiles` where `is_suspended = true`，limit 20。
- `listAbnormalPayments(service)`：`payments` where `status in (failed, closed)`，limit 20。

页面改动：

- `admin/audit`：删除内联查询，改为 `await listAdminAuditLogs(createServiceClient())`。
- `admin/risk`：双查询改为 `Promise.all([listSuspendedProfiles(service), listAbnormalPayments(service)])`；`createServiceClient` 仍被两个 server action 使用，保留。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/admin/queries.ts` | 新增三个 list 服务（audit + 风控双查询） |
| `app/admin/audit/page.tsx` | 列表查询改调 `listAdminAuditLogs`，新增 import |
| `app/admin/risk/page.tsx` | 双查询改调两个 list 服务，新增 import |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/admin/queries.ts \
        app/admin/audit/page.tsx \
        app/admin/risk/page.tsx \
        docs/agent-handoffs/2026-06-26-claude-admin-list-queries-2-result.md
git commit -m "feat(domain): extract admin audit + risk list queries into lib/domain/admin/queries"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint app/admin/audit/page.tsx app/admin/risk/page.tsx lib/domain/admin/queries.ts` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. `admin/audit` 列表展示与下沉前一致（同列、`created_at desc`、limit 100）。
2. `admin/risk`：封禁用户列表（`is_suspended = true`，limit 20）与异常支付列表（`status in failed/closed`，limit 20）与原一致；两个 server action（封禁/解封、支付人工核对）不受影响。
3. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
4. 可选补单测：三个新 list 服务的 `null → []`、过滤条件、limit 与抛错（需 Supabase env，可能仍 skip）。

## 8. 下一轮建议

- `admin/developers`：列表（行 23）+ 详情/审计（行 57/62）查询，作为后台只读下沉的收尾一轮（含一个详情读，稍复杂）。
- 之后转向工作台/公开页的渲染查询分批下沉（`orders/[id]`、`purchases`、`notifications`、`settings`、`customer/demands`、`developer/quotes`、`marketing/developers`），价值中等、纯读路径。
- 也可在任一节点转向真实支付前置（受外部准入约束、保持 blocked）。
