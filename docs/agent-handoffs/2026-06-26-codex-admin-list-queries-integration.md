# Codex 集成验收：后台只读列表查询下沉

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `docs/agent-handoffs/2026-06-26-claude-admin-list-queries-result.md`

## 1. 验收结论

认可 Claude 本轮改动：`admin/demands`、`admin/products`、`admin/orders`、`admin/disputes` 四个后台列表页的只读查询已经下沉到 `lib/domain/admin/queries.ts`。页面默认导出现在只负责鉴权、调用 list 服务和渲染。

等价性检查通过：四个查询的 select 列、`created_at` 倒序、`limit(50)` 与下沉前一致。

## 2. Codex 补充改动

新增本地可执行单元测试：

- `tests/unit/admin/queries.test.ts`
  - list 服务在后端返回 `null` 数据时返回空数组。
  - list 服务保留 `created_at desc` 和 50 条 limit。
  - 后端错误会抛出。

## 3. 验证命令与结果

| 命令 | 结果 |
|---|---|
| `pnpm test tests/unit/admin/queries.test.ts` | 通过：4 tests passed |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm test` | 通过：15 个测试文件通过，8 个数据库/浏览器相关测试文件按 env skip；39 passed / 33 skipped |
| `pnpm build` | 通过 |
| `git diff --check` | 通过 |

说明：`pnpm build` 需要提升权限运行，因为 Turbopack 在普通沙箱内会因本地端口绑定被拒绝。

## 4. 未完成/未覆盖项

- 本地当前没有启用 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`，数据库集成测试仍按既有规则 skip。
- 页面级手工验收仍建议覆盖四个后台列表是否正常展示，以及各页已有 server action 是否不受影响。
- 本轮无 schema/RLS/RPC 改动，未重新生成 `lib/db/types.ts`。

## 5. 下一轮建议

可继续同模式处理后台剩余只读查询：

- `admin/risk`：profiles + payments 双列表。
- `admin/developers`：开发者审核列表及详情。
- `admin/audit`：审计日志列表。

建议仍保持小颗粒，优先处理 `admin/audit` 或 `admin/risk`，避免一次性移动过多页面读路径。
