# Claude 交接给 Codex：订单列表只读查询下沉（第十轮）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-orders-detail-queries-integration.md`

---

## 1. 完成范围

延续订单模块，把 `workspace/orders` 列表页的单个渲染查询下沉到 `lib/domain/orders/queries.ts`，页面只剩鉴权 + 调读服务 + 渲染。与上一轮订单详情读服务同一文件，构成内聚的订单读切片。

## 2. 本轮改动

- `lib/domain/orders/queries.ts` 新增 `listParticipantOrders(service)`：`orders` + 嵌套 `demands(title)`，`created_at desc`，无 limit，使用调用方 RLS-scoped client（仅返回参与方订单）。select 列、join、排序与原查询逐项等价。
- `app/(workspace)/workspace/orders/page.tsx`：查询改为 `const orders = await listParticipantOrders(supabase)`，新增 import；JSX/样式不变（`orders?.map`、`order.demands?.title` 用法不变）。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/orders/queries.ts` | 新增 `listParticipantOrders` |
| `app/(workspace)/workspace/orders/page.tsx` | 渲染查询改调读服务，新增 import |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/orders/queries.ts \
        "app/(workspace)/workspace/orders/page.tsx" \
        docs/agent-handoffs/2026-06-26-claude-orders-list-queries-result.md
git commit -m "feat(domain): extract participant orders list query into lib/domain/orders/queries"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint "app/(workspace)/workspace/orders/page.tsx" lib/domain/orders/queries.ts` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. 订单列表展示与下沉前一致（参与方订单、含需求标题、按创建时间倒序）。
2. 「去付款」入口（待支付且为客户）等渲染逻辑不变。
3. RLS 不变：以参与方身份读取。
4. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
5. 可选补单测：`listParticipantOrders` 的排序、`null → []`、抛错传播。

## 8. 下一轮建议

- 继续工作台每轮一个模块：`workspace/purchases`、`workspace/notifications`、`workspace/settings`、`workspace/customer/demands`、`workspace/developer/quotes`、`workspace/customer/demands/[id]/quotes`、`workspace/disputes/[id]`。
- 公开页：`marketing/developers`（列表）、`developers/[id]`（详情）。
- 或在任一节点转向真实支付前置（受外部准入约束、保持 blocked）。
