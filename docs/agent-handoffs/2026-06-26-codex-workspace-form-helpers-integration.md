# Codex 集成验收：工作台表单解析下沉

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `docs/agent-handoffs/2026-06-26-claude-workspace-form-helpers-result.md`

## 1. 验收结论

认可 Claude 本轮改动：`developer/demands` 的报价金额/有效期换算已下沉到 `lib/domain/quotes/form.ts`，`orders/[id]` 的可选附件字段解析已下沉到 `lib/domain/orders/form.ts`。对应页面 server action 现在只负责读取 `FormData`、调用领域 helper/service、redirect。

`developer/products` 本轮未改是可接受的：价格元转分与主要校验已经在 `createProductForReview` 内完成，页面只把表单值转成现有 `ProductInput` 所需形状。后续如果继续统一“纯 raw form fields”风格，可另开小任务新增产品 form helper。

## 2. Codex 补充改动

新增本地可执行单元测试：

- `tests/unit/quotes/form.test.ts`
  - 金额元 -> 分的 `Math.round` 换算。
  - `validDays` -> 绝对 `expiresAt`。
  - `validDays=0` 时至少保留 1 天有效期。
- `tests/unit/orders/form.test.ts`
  - 附件名称或路径缺失时返回空数组。
  - 附件字段 trim、`contentType` 与 `sizeBytes` coercion。

## 3. 验证命令与结果

| 命令 | 结果 |
|---|---|
| `pnpm test tests/unit/quotes/form.test.ts tests/unit/orders/form.test.ts` | 通过：4 tests passed |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm test` | 通过：14 个测试文件通过，8 个数据库/浏览器相关测试文件按 env skip；35 passed / 33 skipped |
| `pnpm build` | 通过 |
| `git diff --check` | 通过 |

说明：`pnpm build` 需要提升权限运行，因为 Turbopack 在普通沙箱内会因本地端口绑定被拒绝。

## 4. 未完成/未覆盖项

- 本地当前没有启用 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`，数据库集成测试仍按既有规则 skip。
- 本轮无 schema/RLS/RPC 改动，未重新生成 `lib/db/types.ts`。
- 页面级手工验收仍建议覆盖：
  - 开发者报价金额与有效期展示/提交。
  - 订单留言与交付附件是否按预期携带。

## 5. 下一轮建议

页面内联写入逻辑和主要表单换算已经基本收口。下一步可以二选一：

- 继续小颗粒清理：为 `developer/products` 增加 raw form helper，统一所有工作台表单入口风格。
- 转向更有业务价值的模块：真实支付适配器骨架、部署验收、或只读列表查询下沉为 domain list 服务。
