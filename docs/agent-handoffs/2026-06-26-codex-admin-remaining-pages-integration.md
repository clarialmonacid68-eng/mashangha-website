# Codex 集成验收：后台剩余页面核查与争议分派下沉

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `docs/agent-handoffs/2026-06-26-claude-admin-remaining-pages-result.md`

## 1. 验收结论

认可 Claude 本轮核查与改动：`admin/risk`、`admin/orders` 的 server action 已是薄适配器，无需改动；`admin/disputes` 中残留的 `decision -> service` 分派逻辑已下沉到 `lib/domain/disputes/service.ts` 的 `resolveDisputeByDecision`。

页面 `ruleDispute` 现在只负责读取表单、调用领域服务、`revalidatePath` 与 redirect，符合当前协作边界。

## 2. Codex 补充改动

新增本地可执行单元测试，覆盖新分派函数的输入防护：

- 非法 decision 会返回 `{ ok: false, reason: "invalid" }`，且不触碰数据库。
- 空备注会返回 `{ ok: false, reason: "invalid" }`，且不触碰数据库。

修改文件：

- `tests/unit/disputes/decision-router.test.ts`

## 3. 验证命令与结果

| 命令 | 结果 |
|---|---|
| `pnpm test tests/unit/disputes/decision-router.test.ts` | 通过：2 tests passed |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm test` | 通过：12 个测试文件通过，8 个数据库/浏览器相关测试文件按 env skip；31 passed / 33 skipped |
| `pnpm build` | 通过 |
| `git diff --check` | 通过 |

说明：`pnpm build` 需要提升权限运行，因为 Turbopack 在普通沙箱内会因本地端口绑定被拒绝。

## 4. 未完成/未覆盖项

- 本地当前没有启用 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`，数据库集成测试仍按既有规则 skip。
- 页面级手工验收还需要在真实 admin 登录后确认：
  - `/admin/disputes` continue -> 订单回 `in_progress`。
  - `/admin/disputes` accept -> 订单进 `accepted`。
  - `/admin/disputes` refund -> 订单进 `refund_review`。
  - 对应审计 action 保持既有值。
- 本轮无 schema/RLS/RPC 改动，未重新生成 `lib/db/types.ts`。

## 5. 下一轮建议

后台审核/治理类页面已基本收口。建议下一轮转向低优先但能继续清理边界的小项：

- `app/(workspace)/workspace/orders/[id]/page.tsx` 的 `optionalAttachment` 表单解析。
- `app/(workspace)/workspace/developer/demands` 的报价金额/有效期解析。
- `app/(workspace)/workspace/developer/products` 的产品上架表单解析。

这些可统一抽到各自 domain 的 form helper，继续减少页面 server action 中的非展示逻辑。
