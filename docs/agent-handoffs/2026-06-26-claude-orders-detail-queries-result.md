# Claude 交接给 Codex：订单详情只读查询下沉（第九轮，工作台首批）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-admin-developers-boundary-integration.md`

---

## 1. 完成范围

进入工作台/公开页只读查询下沉阶段，按 Codex 建议从 `workspace/orders/[id]`（订单详情）单模块开始。把渲染层 5 个只读查询下沉到新文件 `lib/domain/orders/queries.ts`，页面只剩鉴权 + 调用读服务 + 渲染。

查询用调用方 RLS-scoped client（订单参与方），select 列、过滤、排序均逐项等价。本轮不碰 server action（已在前几轮处理）、不碰 JSX/样式、不碰支付适配器。

## 2. 本轮改动

新增 `lib/domain/orders/queries.ts`：

- `getOrderForParticipant(service, orderId)`：`orders` 单条（`maybeSingle`，不存在返回 `null`，页面据此 `redirect('/workspace/settings')`）。原页面用 `single()`，0 行时 `data` 同样为 `null`，行为等价。
- `listOrderMessages(service, orderId)`：`order_messages`，`created_at asc`。
- `listOrderAttachments(service, orderId)`：`order_attachments`，`created_at asc`。
- `listOrderDeliveries(service, orderId)`：`deliveries`，`version desc`。
- `getOrderReviewByAuthor(service, orderId, authorId)`：`reviews`（`order_id` + `author_id`，`maybeSingle`，返回行或 `null`）。

页面 `app/(workspace)/workspace/orders/[id]/page.tsx`：

- `order` 查询改为 `await getOrderForParticipant(supabase, id)`。
- 四个并行查询改为 `Promise.all([listOrderMessages, listOrderAttachments, listOrderDeliveries, getOrderReviewByAuthor])`。
- 渲染处 `messages?.map` / `attachments?.map` / `deliveries?.map` 不变（list 服务返回数组，`?.` 无害）；`existingReview ? ...` 不变（行或 `null`）。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/orders/queries.ts` | 新增（5 个读服务） |
| `app/(workspace)/workspace/orders/[id]/page.tsx` | 渲染层 5 查询改调读服务，新增 import；server action 与 JSX 未动 |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/orders/queries.ts \
        "app/(workspace)/workspace/orders/[id]/page.tsx" \
        docs/agent-handoffs/2026-06-26-claude-orders-detail-queries-result.md
git commit -m "feat(domain): extract order detail read queries into lib/domain/orders/queries"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint "app/(workspace)/workspace/orders/[id]/page.tsx" lib/domain/orders/queries.ts` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. 订单详情页：order 不存在 → `redirect('/workspace/settings')`；留言/附件/交付/已有评价的展示与下沉前一致（顺序、过滤）。
2. `existingReview` 仍按 `order_id + author_id` 取当前用户的评价（控制「评价」表单是否显示）。
3. RLS 行为不变：仍以参与方身份读取（用 user-scoped client）。
4. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
5. 可选补单测：5 个读服务的过滤/排序/`null → []` 与 `maybeSingle → null`、抛错传播。

## 8. 下一轮建议

- 工作台其余渲染查询，建议每轮一个模块继续：`workspace/orders`（列表）、`workspace/purchases`、`workspace/notifications`、`workspace/settings`、`workspace/customer/demands`、`workspace/developer/quotes`、`workspace/customer/demands/[id]/quotes`、`workspace/disputes/[id]`。
- 公开页：`marketing/developers`（列表）、`developers/[id]`（详情）。
- 或在任一节点转向真实支付前置（受外部准入约束、保持 blocked）。
