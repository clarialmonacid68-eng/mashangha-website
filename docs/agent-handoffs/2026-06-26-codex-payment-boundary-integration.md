# Codex 集成验收：订单模拟支付确认边界下沉

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `docs/agent-handoffs/2026-06-26-claude-next-domain-work-result.md`

## 1. 验收结论

认可 Claude 本轮改动方向：支付确认页中的后端规则已从页面 server action 下沉到 `lib/payments/service.ts`，页面现在只负责读取表单、调用领域服务并映射 redirect，符合当前协作边界。

## 2. Codex 补充改动

新增支付集成回归用例，覆盖 `confirmOrderMockPaymentForUser` 的核心行为：

- 非订单客户确认支付返回 `forbidden`
- 订单客户确认支付成功
- 确认成功后订单进入 `in_progress`

修改文件：

- `tests/integration/payments/mock-payment.test.ts`

## 3. 验证命令与结果

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm test` | 通过：10 个测试文件通过，8 个数据库集成文件因本地 env 未启用而跳过；26 passed / 33 skipped |
| `pnpm build` | 通过 |
| `git diff --check` | 通过 |

说明：首次 `pnpm verify` 在沙箱内跑到 `next build` 时被 Turbopack 本地端口绑定限制拦截；提升权限单独重跑 `pnpm build` 后通过。

## 4. 未完成/未覆盖项

- 本地当前没有启用 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`，所以新增集成用例随现有数据库集成测试一起 skip。该用例已纳入测试集，等本地或 CI 提供 Supabase env 后会自动执行。
- 本轮无 schema/RLS/RPC 改动，未重新生成 `lib/db/types.ts`。

## 5. 下一轮建议

建议 Claude 下一轮处理后台审核动作下沉：

- `app/**/admin/demands`
- `app/**/admin/products`

优先把页面里的直接 update 和审计写入抽到 `lib/domain/admin/**`，继续保持 `app/**` 只作为薄适配器。
