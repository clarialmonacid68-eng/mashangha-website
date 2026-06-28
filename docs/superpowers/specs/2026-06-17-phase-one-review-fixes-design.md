# 第一阶段审查修复设计规格

**日期：** 2026-06-17
**状态：** 已按用户确认执行
**范围：** 审查报告中不依赖真实微信支付的三项 P1 修复

## 1. 目标

把第一阶段“本地可验证交易闭环”补得更自然：客户可以从付款页确认模拟支付；客户验收后可以通过模拟结算进入 `completed` 并评价；关键业务事件写入 `notifications` 表，而不是只停留在内存通知分发器。

本阶段仍不接真实微信支付、真实退款、真实分账或真实账单。

## 2. 变更范围

### 模拟支付确认 UI

支付页在创建模拟支付单后显示“确认模拟支付”按钮。按钮调用现有 `/api/payments/mock/confirm`，确认成功后返回订单详情页，订单进入 `in_progress`。

### 模拟结算完成路径

新增一个本地模拟结算服务，用于第一阶段在客户验收后把订单从 `accepted` 推进到 `completed`。该服务写入 `profit_shares`、`order_status_history` 和审计/通知所需记录，但不代表真实分账。

### 通知持久化

新增 Supabase-backed 通知仓储。关键服务在成功后写站内通知：

- 支付成功通知开发者。
- 留言通知另一方。
- 正式交付通知客户。
- 验收通知开发者。
- 模拟结算完成通知双方。
- 争议全额退款裁决通知双方。

通知写入失败不应回滚主业务动作，但要抛出到测试可见的服务层结果或记录安全日志。

## 3. 测试策略

按 TDD 推进：

1. 先写支付页 UI 确认按钮测试，确认当前失败，再实现。
2. 先写模拟结算服务测试，确认当前缺函数失败，再实现。
3. 先写 Supabase 通知仓储和业务事件测试，确认当前不写表失败，再实现。

验收命令：

```bash
pnpm vitest run tests/integration/payments/mock-payment.test.ts tests/integration/orders/acceptance.test.ts tests/integration/notifications/persistence.test.ts
pnpm playwright test tests/e2e/customer-flow.spec.ts tests/e2e/developer-flow.spec.ts
pnpm verify
```
