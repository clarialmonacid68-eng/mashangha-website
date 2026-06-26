# Claude 交接给 Codex：后台审核动作下沉（第三轮）

**日期：** 2026-06-26
**作者：** Claude
**分支：** `claude/domain-page-boundary`（基线最新提交 `2921a5f`）
**契约文档：** `docs/api/2026-06-26-admin-review-boundary.md`

---

## 1. 完成范围

把 `admin/demands` 与 `admin/products` 页面 server action 里内联的审核业务逻辑（`.update(...)` 状态流转 + 直接写审计 + 决策/备注校验）下沉到 `lib/domain/admin/governance.ts`，页面只保留：读取表单 → 调用领域服务 → `revalidatePath` + redirect 映射。保持小颗粒、只动这两页。

- `admin/demands`：`reviewDemand`（审核发布/拒绝）下沉；`toggleSuspension` 本就已用 `setDemandSuspension`（未改逻辑，仍合规）。
- `admin/products`：`reviewProduct`（审核上架/拒绝）与产品下架/恢复（`setProductSuspension`）下沉。

## 2. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/admin/governance.ts` | 新增 `reviewDemand`、`reviewProduct`、`setProductSuspension` + 类型 `AdminReviewDecision`、`AdminModerationResult`；复用既有 `writeAudit` 与 `logBusinessEvent` |
| `app/admin/demands/page.tsx` | `reviewDemand` action 改为薄适配器并更名 `reviewDemandAction`；移除内联 `.update`/`writeAuditLog`；去掉 `writeAuditLog` import；表单引用同步更新 |
| `app/admin/products/page.tsx` | `reviewProduct`→`reviewProductAction`、`toggleSuspension`→`toggleSuspensionAction` 均改为薄适配器；移除内联 `.update`/`writeAuditLog`；表单引用同步更新 |
| `docs/api/2026-06-26-admin-review-boundary.md` | 新增契约文档 |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

说明：server action 改名是因为页面内同时引入了同名领域函数 `reviewDemand`/`reviewProduct`，避免命名冲突；这是为接入领域服务所做的最小调整，JSX 仅改了 `form action={...}` 绑定，未动结构与样式。

## 3. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock   # 如仍残留
git switch claude/domain-page-boundary
git add lib/domain/admin/governance.ts \
        app/admin/demands/page.tsx \
        app/admin/products/page.tsx \
        docs/api/2026-06-26-admin-review-boundary.md \
        docs/agent-handoffs/2026-06-26-claude-admin-review-boundary-result.md
git commit -m "feat(domain): move admin demand/product review into lib/domain/admin"
```

## 4. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint app/admin/demands/page.tsx app/admin/products/page.tsx lib/domain/admin/governance.ts` | exit 0 ✅ |

## 5. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成阶段执行。

## 6. 需要 Codex 集成验证的事项

1. `/admin/demands`：approve → 需求 `published` + `published_at` + 审计 `demand.approve`；reject → `closed` + 审计 `demand.reject`；空备注 → `?error=missing_note`。
2. `/admin/products`：approve → 产品 `published`；reject → `rejected`；suspend/resume → 切换 `is_suspended`；空备注 → `?error=missing_note`。
3. 审计行 `action` 取值与下沉前一致（`demand.approve/reject`、`product.approve/reject/suspend/resume`）。
4. `supabase gen types` 后无类型漂移（本轮无 schema 改动）。
5. 行为回归：审核后 `revalidatePath` + redirect 与原页面一致。

## 7. 下一轮建议

- `admin/risk`、`admin/disputes`、`admin/orders` 已大多调用 `lib/domain/admin` 与 `lib/domain/disputes` 服务，剩余内联较少，可快速核查收尾。
- `orders/[id]/page.tsx` 仅剩 `optionalAttachment` 表单字段解析（非复杂业务规则），可移入 `lib/domain/orders/form.ts`，优先级低。
- 之后可考虑把 `developer/demands` 的 `submitQuote`（金额/有效期换算）与 `developer/products` 的上架解析统一到对应 domain 的 form helper。

## 8. 已知风险与假设

- 行为等价：三个新函数的状态流转、审计 action、redirect 语义与原页面逐项对齐；校验失败统一返回 `missing_note`，页面映射为 `?error=missing_note`。
- 提交隔离：本分支仍叠在更早未提交改动之上，请按第 3 节只 add 本轮 5 个文件。
- 仅改 `lib/domain/admin/**` 与这两页的 server action 体 + 表单绑定，未碰样式、组件结构、部署、CI、无关页面。
