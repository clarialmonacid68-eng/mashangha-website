# Claude 交接给 Codex：订单/支付边界下沉（第二轮）

**日期：** 2026-06-26
**作者：** Claude
**分支：** `claude/domain-page-boundary`
**契约文档：** `docs/api/2026-06-26-order-payment-confirm-boundary.md`

---

## 1. 完成范围

把支付确认页里内联的后端业务逻辑下沉到 `lib/payments/**`，页面降为薄适配器。本轮刻意保持小颗粒（遵守「小任务、不做超大重构分支」），只处理一个清晰的复杂逻辑单元。

- **订单模拟支付确认**：`app/(workspace)/workspace/orders/[id]/pay/page.tsx` 的 `confirmPayment` 此前内联了「查支付单 → 校验订单归属与买家身份 → seed mock provider → 确认 RPC」。已抽到 `lib/payments/service.ts` 的 `confirmOrderMockPaymentForUser`，页面只把 typed 结果映射为 redirect。

### 本轮的边界扫描结论（供下一轮）

扫描了 `app/**` 全部 `"use server"` 与直接 DB 调用：
- 订单详情页 `orders/[id]/page.tsx` 的 `postMessage/deliverOrder/acceptDelivery/rejectDelivery/completeSettlement/submitReview` **已经只调用领域服务**，属合规薄适配器；仅剩 `optionalAttachment` 这点**表单字段解析**（contentType/size 强转）可在下一轮移入 `lib/domain/orders/form.ts`（非复杂业务规则，优先级低）。
- **后台页面** `admin/demands`、`admin/products` 的审核动作仍**内联直接 update + 写审计**（真正的状态变更在页面里）。这是后端逻辑留在页面的较大候选，但属 admin 模块、且工作量中等，建议作为后续独立小任务下沉（`admin/orders`、`admin/disputes`、`admin/risk` 已大多调用 `lib/domain/admin` 与 `lib/domain/disputes` 服务）。
- `settings/page.tsx` 仅一处 `apply_for_developer` RPC 调用，薄。

## 2. 修改文件列表

| 文件 | 变更 | 对本任务是否干净 |
|---|---|---|
| `lib/payments/service.ts` | 新增 `confirmOrderMockPaymentForUser` + 类型 `ConfirmOrderMockPaymentResult`；新增 `MockPaymentProvider` import | 干净增量 |
| `app/(workspace)/workspace/orders/[id]/pay/page.tsx` | `confirmPayment` 改为薄适配器（调用领域服务 + 映射 redirect）；`createPayment` 未变 | 干净（vs 分支基线） |
| `docs/api/2026-06-26-order-payment-confirm-boundary.md` | 新增契约文档 | 干净（新文件） |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 | — |

## 3. commit 列表

无。提交仍被 `.git/index.lock` 阻塞（沙箱无权删除，`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。需在可删 lock 的环境提交。

建议提交命令（在本机执行）：

```bash
rm -f .git/index.lock   # 如仍残留
git switch claude/domain-page-boundary
git add lib/payments/service.ts \
        "app/(workspace)/workspace/orders/[id]/pay/page.tsx" \
        docs/api/2026-06-26-order-payment-confirm-boundary.md \
        docs/agent-handoffs/2026-06-26-claude-next-domain-work-result.md
git commit -m "feat(domain): move order mock-payment confirmation into lib/payments"
```

## 4. 运行过的命令与结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint <pay page + lib/payments/service.ts>` | exit 0 ✅ |

## 5. 没运行的命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删除。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配，无法运行；按分工归 Codex 集成阶段执行。

## 6. 需要 Codex 接手验证的事项

1. 行为等价回归：创建模拟支付单 → 确认 → 跳转 `/workspace/orders/{id}?payment=confirmed`。
2. 越权确认（确认非本人订单的支付）→ 跳 `/workspace/settings`。
3. 未登录确认 → 跳 `/login`。
4. 缺失/不匹配 providerPaymentId → 跳 `.../pay?error=confirm_failed`；确认 RPC 失败 → 跳 `.../pay?payment={id}&error=confirm_failed`。
5. `supabase gen types` 后无类型漂移（本轮无 schema 改动）。

## 7. 需要 Codex 集成到页面或部署的事项

- 无需新增页面或 UI；本轮仅重排了 server action 与领域层的边界，页面对外行为不变。
- 无部署影响（未碰部署/CI 文件）。

## 8. 已知风险与假设

- 提交隔离：本分支仍叠在上一轮大量未提交改动之上，请先落定基线再提交本轮干净文件（见第 3 节命令，只 add 本轮 4 个文件）。
- `confirmOrderMockPaymentForUser` 的 redirect 映射逐项对齐原页面行为，未改变对外语义。
- 仅改 `lib/payments/**` 与该页 server action 体，未碰 JSX/样式/组件/部署/CI。
