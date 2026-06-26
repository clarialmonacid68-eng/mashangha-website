# Claude 交接给 Codex：admin/developers 边界下沉（第八轮，后台收尾）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-admin-list-queries-2-integration.md`

---

## 1. 完成范围

后台只读查询下沉的收尾页 `admin/developers`。这页同时含**内联审核写动作**和**两个只读查询**，本轮一并处理：

- 写动作 `reviewDeveloper`（内联 `.update(developer_profiles)` + `writeAuditLog`）下沉到 `lib/domain/admin/governance.ts` 的 `reviewDeveloperProfile`，页面 server action 改薄适配器。
- 两个只读查询（开发者资料列表 + 开发者审计日志）下沉到 `lib/domain/admin/queries.ts`。
- 页面保留「从审计日志 metadata 提取 note 并按开发者聚合」的**展示层数据整形**（逐字保留，行为等价；不属于状态变更/权限/多表写，按边界允许留在页面）。

至此后台所有页面（demands / products / orders / disputes / risk / audit / developers）的内联写动作与只读查询均已下沉完毕。

## 2. 本轮改动

- `lib/domain/admin/governance.ts` 新增 `reviewDeveloperProfile(service, { adminId, decision, developerId, note })`：复用既有 `AdminModerationResult`、`isReviewDecision`、`writeAudit`、`logBusinessEvent`；状态流转 `review_status → approved/rejected`、`rejection_reason`（reject 时为 note，approve 时 null）、`reviewed_at`，审计 action `developer.approve/reject`。
- `lib/domain/admin/queries.ts` 新增 `listAdminDevelopers`（`developer_profiles`，`updated_at desc`，limit 50）与 `listDeveloperReviewAuditLogs`（`audit_logs` where `entity_type = developer_profile`，`created_at desc`，limit 100）。
- `app/admin/developers/page.tsx`：
  - `reviewDeveloper` → `reviewDeveloperAction`（薄适配器），移除内联 `.update`/`writeAuditLog`，去掉 `writeAuditLog` import，表单绑定更新。
  - 默认导出双查询改为 `Promise.all([listAdminDevelopers(service), listDeveloperReviewAuditLogs(service)])`，备注聚合 Map 逻辑保留不变。

命名说明：server action 更名 `reviewDeveloperAction`，因页面引入了同名领域函数前缀风险；JSX 仅改 `form action` 绑定，未动结构样式。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/admin/governance.ts` | 新增 `reviewDeveloperProfile` |
| `lib/domain/admin/queries.ts` | 新增 `listAdminDevelopers`、`listDeveloperReviewAuditLogs` |
| `app/admin/developers/page.tsx` | server action 改薄适配器；双查询改调 list 服务；表单绑定更新；移除内联写入与 `writeAuditLog` import |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/admin/governance.ts \
        lib/domain/admin/queries.ts \
        app/admin/developers/page.tsx \
        docs/agent-handoffs/2026-06-26-claude-admin-developers-boundary-result.md
git commit -m "feat(domain): move admin developer review + list queries into lib/domain/admin"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint app/admin/developers/page.tsx lib/domain/admin/queries.ts lib/domain/admin/governance.ts` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. `/admin/developers`：approve → `review_status=approved` + `reviewed_at` + 审计 `developer.approve`；reject → `rejected` + `rejection_reason=note` + 审计 `developer.reject`；空备注或非法 decision → `?error=missing_note`。
2. 列表与审计读取结果与下沉前一致（开发者按 `updated_at desc` limit 50；审计 `entity_type=developer_profile`、`created_at desc` limit 100）；备注聚合展示不变。
3. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
4. 可选补单测：`reviewDeveloperProfile` 的 approve/reject 分支与 `missing_note`；两个新 list 服务的过滤/排序/limit。

## 8. 下一轮建议

- 后台模块已收口（写动作 + 只读查询全部下沉）。
- 下一阶段可转向工作台/公开页的渲染查询分批下沉（`orders/[id]`、`purchases`、`notifications`、`settings`、`customer/demands`、`developer/quotes`、`marketing/developers`、`developers/[id]`），价值中等、纯读路径，建议每轮一个模块。
- 或在任一节点转向真实支付前置（受外部准入约束、保持 blocked）。
