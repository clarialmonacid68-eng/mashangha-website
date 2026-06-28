# Claude 交接给 Codex：后台剩余页面核查与争议分派下沉（第四轮）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游建议：** `docs/agent-handoffs/2026-06-26-codex-...integration`（Codex 第三轮验收的下一轮建议）

---

## 1. 完成范围

核查 `admin/risk`、`admin/disputes`、`admin/orders` 三页 server action 是否还有内联状态变更 / 审计写入 / 业务规则。

核查结论：

- **`admin/risk`**：`banUser`、`reviewPayment` 已是薄适配器（必填校验 + 调用 `setUserSuspension` / `recordPaymentReview`），**无内联写入或审计**。无需改动。
- **`admin/orders`**：`toggleFreeze`、`runRefund` 已是薄适配器（调用 `setOrderFrozen` / `executeOrderRefund`），**无内联写入或审计**。无需改动。
- **`admin/disputes`**：`ruleDispute` 虽已调用领域服务，但页面里仍残留一段「decision → 三个不同 resolve 服务」的**业务路由 + 校验**逻辑。本轮将其下沉。

页面里其余的 `.from(...)` 均为默认导出中的**只读列表查询**（展示用），非 server action 写入，按既有边界保留在页面。

## 2. 本轮改动

把争议裁决的「决策分派 + 输入校验」下沉到领域层：

- 新增 `resolveDisputeByDecision(supabase, { adminId, decision, disputeId, notes })`，内部按 `decision` 调度既有的 `resolveDisputeAsContinue / resolveDisputeAsAccept / resolveDisputeAsFullRefund`，并做输入校验，返回 typed result。
- `admin/disputes` 的 `ruleDispute` 变为薄适配器：读表单 → 调用 `resolveDisputeByDecision` → `revalidatePath` + redirect。

命名说明：聚合函数取名 `resolveDisputeByDecision` 而非 `resolveDispute`，因为 `lib/domain/disputes/service.ts` 内已存在一个私有 helper `resolveDispute`（continue/accept 共用），避免重名冲突。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/disputes/service.ts` | 新增 `resolveDisputeByDecision` + 类型 `DisputeDecision`、`ResolveDisputeResult` |
| `app/admin/disputes/page.tsx` | `ruleDispute` 改为薄适配器；移除内联 decision 分派与校验 |
| `docs/api/2026-06-26-admin-review-boundary.md` | （沿用，无新增契约；本轮为同模块的分派下沉，行为不变） |
| `app/admin/risk/page.tsx`、`app/admin/orders/page.tsx` | 未改（核查后确认已合规） |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/disputes/service.ts \
        app/admin/disputes/page.tsx \
        docs/agent-handoffs/2026-06-26-claude-admin-remaining-pages-result.md
git commit -m "feat(domain): route admin dispute ruling via resolveDisputeByDecision"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint app/admin/disputes/page.tsx lib/domain/disputes/service.ts app/admin/risk/page.tsx app/admin/orders/page.tsx` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. `/admin/disputes`：continue → 订单回 `in_progress`；accept → `accepted`；refund → `refund_review`；三者审计 action 与下沉前一致（`dispute.resolve_continue/accept/refund`）。
2. 空备注或非法 decision → 跳 `/admin/disputes?error=missing_note`（行为不变）。
3. 成功后 `revalidatePath` + 跳 `?resolved={disputeId}`。
4. `admin/risk`、`admin/orders` 未改，回归应无变化。
5. 本轮无 schema 改动，`supabase gen types` 预期无漂移。

## 8. 下一轮建议

- 后台审核/治理类页面已基本全部下沉完毕（demands / products / risk / orders / disputes）。
- 剩余非后台的小项（低优先）：`orders/[id]/page.tsx` 的 `optionalAttachment` 表单解析、`developer/demands` 的 `submitQuote` 金额/有效期换算、`developer/products` 上架解析——可统一到各自 domain 的 form helper。
- 建议下一轮转向「读取列表查询」是否要下沉为 domain 的 list 服务（目前页面直接 `.from(...)` 只读），或转入其他后端模块（如真实支付前置）。
