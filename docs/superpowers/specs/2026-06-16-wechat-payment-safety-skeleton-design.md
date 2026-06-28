# 微信支付本地安全骨架设计规格

**日期：** 2026-06-16
**状态：** 待用户复核
**范围：** Task 16 的本地可实现部分
**前置约束：** Task 15 Step 2 尚未完成，真实微信支付进件、付款、退款、分账和账单接口保持禁用

## 1. 目标

在微信支付产品准入、二级商户规则、生产证书和 API 权限尚未书面确认前，先完成不会触碰真实资金的本地安全骨架。目标是让后续真实接入时有清晰边界、测试保护和最小化敏感数据策略，而不是提前假设微信支付规则。

本阶段只允许实现：

- 微信支付配置读取和 disabled 状态判断。
- 请求签名、回调验签、回调幂等的本地可测试能力。
- 二级商户入驻状态机。
- 开发者收款账户页面占位。
- 不保存高敏资料的字段边界和脱敏摘要。

本阶段不允许实现：

- 真实二级商户进件提交。
- 真实支付下单。
- 真实退款。
- 真实分账。
- 真实账单下载。
- 任何对外宣传“资金托管”“担保交易”“自动分账”的页面文案。

## 2. 推荐方案

采用“安全骨架 + disabled 适配器”方案。

代码中可以有微信支付模块，但默认配置必须是 disabled。缺少生产商户号、证书序列号、私钥、API v3 密钥、回调域名或产品权限确认时，所有真实网络动作都必须失败为明确的配置错误。

这样既能推进本地工程质量，也不会把未确认的产品规则写死到资金链路里。

## 3. 组件设计

### 3.1 配置模块

新增 `lib/payments/wechat/config.ts`。

职责：

- 读取环境变量。
- 判断微信支付是否启用。
- 返回缺失项列表。
- 区分本地测试配置和生产配置。

关键规则：

- 默认 `enabled=false`。
- 只有显式设置启用标记并且必填项完整时，才允许进入真实客户端。
- 日志不得输出私钥、API v3 密钥、完整证书内容或完整回调签名。

### 3.2 客户端安全模块

新增 `lib/payments/wechat/client.ts`。

职责：

- 生成待签名消息。
- 使用私钥生成请求签名。
- 使用平台证书公钥或测试公钥验证回调签名。
- 提供统一的 disabled 网络请求入口。

本阶段的客户端不直接调用微信生产 API。若调用真实请求方法，应抛出类似 `WechatPayDisabledError` 的明确错误，并提示 Task 15 Step 2 未完成。

### 3.3 入驻状态模块

新增 `lib/payments/wechat/onboarding.ts`。

职责：

- 定义入驻状态：`not_started -> submitting -> reviewing -> approved/rejected`。
- 校验允许的状态转换。
- 生成提交前的最小化资料摘要。
- 保存渠道申请号、状态、脱敏摘要和审核备注。

敏感数据策略：

- 身份证、银行卡、证件照等高敏信息不进入平台长期存储。
- 本地测试可使用脱敏夹具。
- 生产接入时优先直传微信支付接口，平台只保存必要状态和脱敏摘要。

### 3.4 API 与页面

新增 `app/api/wechat/onboarding/route.ts` 和 `app/api/wechat/onboarding/notify/route.ts`。

当前行为：

- 提交接口只创建或更新本地入驻意向，不调用微信。
- 通知接口只验证签名、幂等键和状态转换；真实字段版本等微信确认后再补齐。
- 对缺少配置或未开通权限的请求返回明确 blocked 状态。

新增 `app/(workspace)/workspace/developer/payment-account/page.tsx`。

页面展示：

- 当前收款账户状态。
- 为什么当前不能开通真实收款。
- 需要准备的资料清单。
- 运营审核和微信支付开通状态说明。

页面不得诱导用户上传身份证或银行卡原件，直到真实进件接口和隐私处理流程确认。

## 4. 数据设计

优先复用已有开发者资料表。如果现有结构不足，再通过迁移新增轻量字段或独立表：

- `developer_id`
- `provider`
- `status`
- `channel_application_id`
- `redacted_subject`
- `last_error`
- `submitted_at`
- `reviewed_at`
- `created_at`
- `updated_at`

不得新增用于保存身份证号、银行卡号、证件图片长期地址的字段。

## 5. 数据流

```text
开发者进入收款账户页
  -> 查看资料清单和当前状态
  -> 提交本地入驻意向
  -> 平台保存最小化摘要
  -> 状态进入 submitting 或 reviewing
  -> 微信真实进件保持 blocked
```

回调流：

```text
微信回调或测试夹具
  -> 验签
  -> 计算幂等键
  -> 检查状态转换
  -> 写入状态和审计记录
```

## 6. 错误处理

- 配置缺失：返回 blocked，并列出非敏感缺失项名称。
- 签名错误：返回 unauthorized，不写入业务状态。
- 重复回调：返回 success，并保持已有状态。
- 非法状态转换：返回 conflict，并写安全日志。
- 未确认产品规则：返回 blocked，不尝试真实网络请求。

## 7. 测试计划

先写测试，再实现。

测试文件：`tests/integration/payments/wechat-onboarding.test.ts`。

覆盖：

- 缺少微信配置时模块处于 disabled。
- 签名消息生成稳定。
- 回调验签失败时拒绝处理。
- 重复回调只处理一次。
- 入驻状态只能按允许路径转换。
- 敏感资料摘要不包含身份证、银行卡、密钥或完整签名。

必要时增加单元测试：

- `tests/unit/payments/wechat-config.test.ts`
- `tests/unit/payments/wechat-signature.test.ts`

## 8. 验收标准

- 所有新增测试先失败再通过。
- `pnpm vitest run tests/integration/payments/wechat-onboarding.test.ts` 通过。
- `pnpm verify` 通过。
- 真实微信支付仍处于 blocked/disabled，不会发起生产请求。
- Task 15 Step 2 未完成前，Task 17-19 不开始真实资金实现。
