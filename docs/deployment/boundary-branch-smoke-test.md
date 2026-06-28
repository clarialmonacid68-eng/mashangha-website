# 边界清理分支合并后烟测清单

**日期：** 2026-06-27  
**分支：** `claude/domain-page-boundary`  
**适用阶段：** 合并前最终检查、合并后本地/服务器烟测、腾讯云部署验收  
**目标：** 确认边界清理没有改变用户行为，且核心交易链路仍可跑通。

## 1. 合并前本地检查

在合并或发 PR 前执行：

```bash
rg -n "\.(from|rpc)\(" app --glob '!node_modules'
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

预期：

- `app/**` 中没有直接 `.from(...)` 或 `.rpc(...)` 调用。
- lint 通过。
- TypeScript 通过。
- 单元测试通过。
- Next.js 生产构建通过。

## 2. 环境变量检查

本地或服务器 `.env.production` 至少确认：

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=mock
ORDER_FILE_MAX_BYTES=52428800
```

当前阶段必须保持：

- `PAYMENT_PROVIDER=mock`
- 微信支付相关变量留空或仅作占位
- 不开放真实资金流

## 3. 公共页面烟测

| 路径 | 验收点 |
| --- | --- |
| `/` | 首页可打开，无控制台致命错误 |
| `/demands` | 需求列表可打开；筛选参数不会报错 |
| `/demands/[id]` | 已发布且未暂停的需求详情可打开；不存在/不可见时返回 404 |
| `/developers` | 已审核开发者列表可打开 |
| `/developers/[id]` | 已审核开发者详情可打开；未审核开发者不可公开访问 |
| `/products` | 已发布且未暂停产品列表可打开；分类/关键词筛选可用 |
| `/products/[id]` | 已发布产品详情可打开；未登录购买跳转登录或显示错误 |
| `/rules/service` | 服务协议可打开 |
| `/rules/trading` | 交易规则可打开 |
| `/robots.txt` | 可访问 |
| `/sitemap.xml` | 可访问且域名符合当前环境 |

## 4. 账号与工作台烟测

| 流程 | 验收点 |
| --- | --- |
| 注册 | 邮箱注册可提交；错误能正确展示 |
| 登录 | 邮箱密码登录可进入工作台 |
| 工作台布局 | 角色读取正常；无角色时按预期跳转 |
| `/workspace/settings` | 当前身份、账号标识、联系方式显示正常 |
| 切换身份 | 仅允许切换到已有角色 |
| 申请开发者角色 | 调用领域服务，不直接在页面触发 RPC；失败有错误提示 |

## 5. 客户需求链路烟测

| 步骤 | 验收点 |
| --- | --- |
| 新建需求 | `/workspace/customer/demands/new` 可提交草稿/发布请求 |
| 我的需求 | `/workspace/customer/demands` 只显示当前客户需求 |
| 报价列表 | `/workspace/customer/demands/[id]/quotes` 只显示该需求报价 |
| 选标 | 选择报价后生成订单并跳转/提示成功 |

## 6. 开发者链路烟测

| 步骤 | 验收点 |
| --- | --- |
| 开发者认证资料 | `/workspace/developer/apply` 可提交；技能/服务范围拆分正常；起步价元转分正常 |
| 开发者资料页 | `/workspace/developer/profile` 能读取当前开发者资料 |
| 可报价需求 | `/workspace/developer/demands` 能看到可报价需求 |
| 提交报价 | 金额元转分、有效期换算正常 |
| 我的报价 | `/workspace/developer/quotes` 只显示当前开发者报价 |
| 产品上架 | `/workspace/developer/products` 可提交产品审核 |

## 7. 订单与模拟支付烟测

| 步骤 | 验收点 |
| --- | --- |
| 我的订单 | `/workspace/orders` 只显示当前参与订单 |
| 订单详情 | `/workspace/orders/[id]` 只允许订单参与方访问 |
| 留言 | 客户/开发者可发送订单留言 |
| 附件 | 上传签名和下载签名可用；非订单附件不可下载 |
| 创建支付单 | `/workspace/orders/[id]/pay` 仅客户可进入；勾选规则后创建 mock 支付单 |
| 确认支付 | mock 支付确认成功后订单进入已付款状态 |
| 交付 | 开发者可提交交付链接或附件 |
| 验收 | 客户可验收交付 |
| 退回交付 | 退回原因为空时提示错误 |
| 模拟结算 | 仅订单客户可完成模拟结算 |
| 评价 | 客户可提交评分和评价 |

## 8. 产品购买烟测

| 步骤 | 验收点 |
| --- | --- |
| 产品详情购买 | 未登录用户按预期提示/跳转 |
| 创建购买记录 | 登录用户可创建模拟购买 |
| 我的购买 | `/workspace/purchases` 只显示当前买家的购买记录 |
| 确认购买 | mock 购买确认后显示授权码或交付内容 |

## 9. 争议与风控烟测

| 路径/动作 | 验收点 |
| --- | --- |
| `/workspace/disputes/[id]` | 仅相关参与方可读取争议详情 |
| `/admin/disputes` | 管理员可按决策处理争议 |
| `/admin/risk` | 暂停/恢复账号、异常支付处理要求备注 |
| `/admin/orders` | 冻结订单、模拟退款动作要求备注 |

## 10. 管理后台烟测

| 路径 | 验收点 |
| --- | --- |
| `/admin/demands` | 需求审核/暂停动作可用，缺少备注时提示 |
| `/admin/products` | 产品审核/暂停动作可用，缺少备注时提示 |
| `/admin/developers` | 开发者审核可用，拒绝时要求备注 |
| `/admin/orders` | 订单列表可读；冻结/退款模拟动作可用 |
| `/admin/disputes` | 争议列表可读；处理动作可用 |
| `/admin/risk` | 风控列表可读；处理动作可用 |
| `/admin/audit` | 审计日志可读 |

## 11. 腾讯云服务器烟测

在服务器上执行：

```bash
pnpm install --frozen-lockfile
pnpm build
pm2 restart mshcode || pm2 start ecosystem.config.cjs
pm2 status
curl -I http://127.0.0.1:3000
curl -I http://82.157.139.80
```

预期：

- `pnpm build` 通过。
- PM2 进程在线。
- 本机 `127.0.0.1:3000` 返回 200/30x。
- Nginx 代理后的公网 IP 返回 200/30x。

备案完成并切换域名后再检查：

```bash
curl -I https://www.mshcode.com
curl -I https://www.mshcode.com/robots.txt
curl -I https://www.mshcode.com/sitemap.xml
```

## 12. 上线阻断项

出现以下任一情况，不建议上线：

- `pnpm build` 失败。
- `app/**` 又出现直接 `.from(...)` / `.rpc(...)`。
- 生产环境缺少 Supabase anon key 或 service role key。
- `PAYMENT_PROVIDER` 不是 `mock`，但真实支付资质未完成。
- 管理后台无需管理员身份即可访问。
- 客户可访问非本人订单或非本人购买记录。
- 开发者可访问非本人报价/产品管理数据。
- 文件下载接口能下载不属于该订单的附件。

## 13. 验收记录模板

```md
# 部署烟测记录

日期：
环境：local / Tencent Cloud IP / production domain
提交：
执行人：

## 自动检查

- app data access scan：
- lint：
- typecheck：
- test：
- build：

## 手工链路

- public pages：
- auth：
- customer demand：
- developer quote：
- order + mock payment：
- delivery + acceptance：
- product purchase：
- admin：
- files：

## 问题

1.
2.

## 结论

通过 / 不通过
```

