# 腾讯云部署前检查清单

**日期：** 2026-06-19
**适用项目：** `/Users/yangchao/Desktop/mahcod-website`
**目标域名：** `https://www.mshcode.com/`
**目标服务器：** 腾讯云轻量应用服务器 / CVM
**已知服务器信息：** 中国大陆北京地域，Ubuntu 24.04 LTS，2 核 CPU / 2GB 内存，40GB SSD，200GB/月流量，公网 IPv4 `82.157.139.80`
**当前建议：** 先完成服务器初始化、环境安装和公网 IP 访问测试；ICP备案完成前，不要把 `www.mshcode.com` 正式解析到该大陆服务器。站点定位仍为“第一阶段模拟交易演示 / 试运营获客站”，不要开放真实支付、真实退款、自动分账或资金托管宣传。

## 1. 当前代码部署形态

项目是标准 Next.js 应用：

- Node 框架：Next.js `16.2.9`
- 包管理：`pnpm`
- 构建命令：`pnpm build`
- 运行命令：`pnpm start`
- 默认运行端口：`3000`
- 数据/Auth/Storage：当前代码使用 Supabase SDK
- 支付：当前应保持 `PAYMENT_PROVIDER=mock`

已通过的本地验证：

- `pnpm verify`
- `pnpm playwright test`

## 2. 腾讯云部署推荐路线

### 推荐路线 A：腾讯云 CVM 只部署 Next.js，Supabase 继续托管

这是当前代码改动最小的路线。

适合：

- 想尽快把新版站点放到 `www.mshcode.com`
- 暂时接受数据库/Auth/Storage 仍由 Supabase 托管
- 先做演示和试运营，不开放真实资金流

需要准备：

- 腾讯云 CVM 一台，建议 Linux 系统
- Node.js、pnpm、Nginx、PM2 或 systemd
- 生产 Supabase 项目
- Supabase Auth redirect 配置加入 `https://www.mshcode.com/auth/callback`
- Supabase Storage 创建私有 bucket：`order-files`
- 域名 DNS 指向腾讯云 CVM 公网 IP
- 由于当前服务器在中国大陆北京地域，必须先完成 ICP 备案，再把 `mshcode.com` / `www.mshcode.com` 正式解析到服务器
- 备案完成后再评估公安备案要求

主要风险：

- 用户访问网站在腾讯云，但 Auth/DB/Storage 请求仍跨到 Supabase；大陆网络稳定性必须实测
- 中国大陆手机号 OTP 不能默认依赖 Supabase 托管短信
- 生产数据备份、恢复、权限审计仍要在 Supabase 侧配置

### 路线 B：腾讯云 CVM + 自托管 Supabase

这是中期路线，迁移成本明显高于路线 A。

适合：

- 希望数据和服务尽量放在自己服务器
- 能承担数据库、Auth、Storage、备份、安全升级的运维责任

需要准备：

- Docker / Docker Compose
- PostgreSQL 持久化磁盘和自动备份
- Supabase Auth SMTP/SMS 配置
- Storage 持久化或接入腾讯云 COS
- 防火墙、内网访问控制、日志与监控

主要风险：

- 运维复杂度高
- 安全边界更难维护
- 升级 Supabase 组件需要额外测试

### 路线 C：全腾讯云产品替换 Supabase

这是长期生产路线，不建议现在立刻做。

可能替换关系：

- Supabase Auth -> 自研账号系统 + 腾讯云短信/邮箱
- Supabase PostgreSQL -> 腾讯云数据库 PostgreSQL
- Supabase Storage -> 腾讯云 COS
- Supabase RLS/RPC -> 应用服务层鉴权 + SQL/RPC 重写

主要风险：

- 需要重写认证、RLS、Storage 签名 URL 和大量集成测试
- 当前第一阶段目标会被基础设施迁移拖慢

## 3. 生产环境变量

模板见根目录 `.env.production.example`。

必填：

```bash
NEXT_PUBLIC_APP_URL=https://www.mshcode.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=mock
```

建议也配置：

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
ORDER_FILE_MAX_BYTES=52428800
```

暂不启用：

```bash
WECHATPAY_MCH_ID=
WECHATPAY_APP_ID=
WECHATPAY_SERIAL_NO=
WECHATPAY_PRIVATE_KEY=
WECHATPAY_API_V3_KEY=
WECHATPAY_NOTIFY_URL=
```

## 4. Supabase 生产侧检查

上线前必须确认：

- 已创建生产 Supabase 项目，不能使用本地 CLI key
- 已执行全部 `supabase/migrations/*.sql`
- 已创建私有 Storage bucket：`order-files`
- Auth Site URL 设置为 `https://www.mshcode.com`
- Redirect URLs 至少包含：
  - `https://www.mshcode.com`
  - `https://www.mshcode.com/auth/callback`
- 生产 SMTP 已配置或明确暂不开放邮箱 OTP
- 手机 OTP 服务商已选定；未完成真实号码测试前，不建议开放手机号登录给真实用户
- Service Role Key 只放在服务器环境变量中，不进入前端、不进入仓库

当前生产 Supabase 状态：

- Organization：`mshcode`
- Project：`mshcode-production`
- Project ref：`lvinajipyscukaemiwys`
- Region：Southeast Asia (Singapore)
- Project URL：`https://lvinajipyscukaemiwys.supabase.co`
- Storage：已创建私有 bucket `order-files`
- Database：已在 SQL Editor 执行 `docs/deployment/generated/production-migrations.sql`
- 验证结果：Table Editor 已显示 `audit_logs`、`demands`、`orders`、`payments`、`profiles`、`quotes`、`user_roles` 等 public 表
- API keys：需要在服务器 `.env.production` 填入兼容当前代码的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`；不要把 `service_role` key 发到聊天窗口或提交到仓库

## 5. 腾讯云 CVM / Nginx 部署清单

详细命令见：`docs/deployment/tencent-cloud-server-init.md`。

服务器基础：

- 安装 Node.js 20 或更新的 LTS 版本
- 启用 pnpm
- 安装 Nginx
- 使用 PM2、systemd 或 Docker 管理 Next.js 进程
- 腾讯云安全组开放端口：`80`、`443`
- 应用仅监听本机端口，例如 `127.0.0.1:3000`

典型部署步骤：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Nginx 反向代理要点：

```nginx
server {
  listen 80;
  server_name mshcode.com www.mshcode.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

HTTPS：

- 推荐使用腾讯云 SSL 证书或 Certbot
- 强制 HTTP 跳转 HTTPS
- Supabase Auth 回调必须使用 HTTPS 域名

## 6. DNS 与备案

当前已知：

- 用户已有 `mshcode.com`
- 当前线上站点曾部署在 Vercel `sin1`
- 现计划部署到腾讯云大陆北京服务器
- ICP 备案尚未完成

必须确认：

- `mshcode.com` 域名实名认证状态
- 因服务器位于中国大陆地域，必须先完成 ICP 备案
- 备案完成后页脚展示备案号，并链接到工信部备案系统
- DNS 记录：
  - `www` CNAME 或 A 记录指向腾讯云入口
  - 根域 `@` 根据 DNS 服务能力配置 A 记录或跳转

备案完成前建议：

- 不把 `www.mshcode.com` 解析到腾讯云大陆服务器
- 可以先使用公网 IP 做服务器连通性、Node/Nginx、构建和反代测试
- 如必须保留线上域名访问，可暂时继续使用当前境外/Vercel 预览站，直到备案完成

当前公网 IP 测试状态：

- 服务器公网 IPv4：`82.157.139.80`
- `curl -I http://82.157.139.80` 当前无法连接到 80 端口
- 下一步需要确认腾讯云防火墙/安全组是否开放 80，并登录服务器安装 Nginx、Node.js、pnpm、PM2

## 7. 上线前功能开关

必须保持：

- `PAYMENT_PROVIDER=mock`
- 页面文案不得写“资金托管”“担保交易”“保证退款”“自动分账”
- 对外成交仍走线下合同 + 人工收款

建议限制：

- 管理后台路径 `/admin/*` 只给内部管理员账号使用
- 生产首批账号由管理员人工审核
- 文件上传上限先保持 50 MB

## 8. 上线验收步骤

部署完成后按顺序检查：

1. `https://www.mshcode.com/` 返回 200
2. `/demands`、`/developers`、`/rules/service` 可访问
3. `robots.txt` 和 `sitemap.xml` 使用生产域名
4. 邮箱登录回调跳回 `/workspace/settings`
5. 管理员可审核需求和开发者
6. 客户可发布需求
7. 开发者可报价
8. 客户可选标并完成模拟全额付款
9. 开发者可提交交付
10. 客户可验收、评价
11. 订单附件上传和下载可用
12. 管理后台争议、冻结、暂停、退款模拟动作可用

## 9. 当前阻塞项

这些不是写代码能直接绕过的事项：

- ICP 备案尚未完成
- 腾讯云服务器公网 IP 未提供
- 生产 Supabase 项目未确认
- 生产 SMTP 未确认
- 国内手机号 OTP 服务商未确认
- 微信支付商户、退款、分账、对账未完成准入
- 生产监控、日志告警、备份策略未落地

## 10. 我建议的下一步

1. 立即启动 `mshcode.com` 的腾讯云 ICP 备案流程。
2. 先选择路线 A，把 Next.js 部署到腾讯云 CVM，Supabase 继续作为后端服务。
3. 创建生产 Supabase 项目并跑迁移。
4. 配置 `.env.production`，但保持 `PAYMENT_PROVIDER=mock`。
5. 在备案完成前，先用公网 IP 完成服务器初始化、Nginx 反代和应用 smoke test。
6. 备案完成后配置 DNS、HTTPS，并做一轮生产域名 smoke test。
7. 再决定是否迁移到自托管 Supabase 或腾讯云数据库/COS。
