# 腾讯云 Ubuntu 24.04 服务器初始化步骤

**日期：** 2026-06-19
**服务器：** 腾讯云大陆北京轻量应用服务器，Ubuntu 24.04 LTS，2 核 / 2GB / 40GB SSD，公网 IPv4 `82.157.139.80`
**当前阶段：** ICP 备案进行中。先做公网 IP 访问测试，不把 `www.mshcode.com` 正式解析到大陆服务器。

## 0. 前提

需要先拿到：

- 服务器公网 IP：`82.157.139.80`
- SSH 登录用户，通常是 `ubuntu` 或 `root`
- SSH 密钥或密码
- 腾讯云安全组已开放：
  - `22`：SSH
  - `80`：HTTP 测试
  - `443`：备案完成后 HTTPS

以下命令默认在服务器上执行。

## 1. 登录服务器

```bash
ssh ubuntu@82.157.139.80
```

如果腾讯云给的是 `root`：

```bash
ssh root@82.157.139.80
```

## 2. 系统更新

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git unzip ca-certificates gnupg lsb-release ufw
```

检查系统：

```bash
lsb_release -a
uname -a
```

## 3. 创建部署用户

如果当前不是专门的部署用户，建议创建 `deploy`：

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

复制 SSH key：

```bash
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

之后重新登录：

```bash
ssh deploy@你的服务器公网IP
```

## 4. 配置基础防火墙

腾讯云安全组是第一层，服务器内的 `ufw` 是第二层：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## 5. 安装 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

启用 pnpm：

```bash
sudo corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

## 6. 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx --no-pager
```

用浏览器访问：

```text
http://82.157.139.80
```

能看到 Nginx 默认页即可。

## 7. 安装 PM2

```bash
sudo npm install -g pm2
pm2 -v
```

配置开机自启：

```bash
pm2 startup systemd
```

执行命令输出里提示的那一行 `sudo env PATH=... pm2 startup ...`。

保存进程列表：

```bash
pm2 save
```

## 8. 创建项目目录

```bash
sudo mkdir -p /var/www/mshcode/app
sudo chown -R deploy:deploy /var/www/mshcode
cd /var/www/mshcode
```

## 9. 获取代码

如果代码已推到 GitHub：

```bash
git clone 仓库地址 app
cd app
```

如果暂时不走 GitHub，可以从本机用 `rsync` 上传。下面命令在本机项目目录执行：

```bash
rsync -az --delete --exclude-from=.deployignore ./ deploy@82.157.139.80:/var/www/mshcode/app/
```

如果当前只能用 `root` 登录：

```bash
rsync -az --delete --exclude-from=.deployignore ./ root@82.157.139.80:/var/www/mshcode/app/
```

上传后在服务器上进入项目目录：

```bash
cd /var/www/mshcode/app
```

## 10. 配置生产环境变量

在服务器项目目录创建 `.env.production`：

```bash
cp .env.production.example .env.production
nano .env.production
```

必须填入：

```bash
NEXT_PUBLIC_APP_URL=http://82.157.139.80
NEXT_PUBLIC_SUPABASE_URL=https://lvinajipyscukaemiwys.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=mock
ORDER_FILE_MAX_BYTES=52428800
```

备案完成并切换域名后，再改为：

```bash
NEXT_PUBLIC_APP_URL=https://www.mshcode.com
```

注意：

- 不要把 `.env.production` 提交到 Git
- `SUPABASE_SERVICE_ROLE_KEY` 只能放服务器
- Supabase `service_role` key 不要发到聊天窗口；在服务器终端或安全密钥管理工具中直接填写
- 真实支付字段在当前阶段保持空值

## 11. 安装依赖并构建

```bash
pnpm install --frozen-lockfile
pnpm build
```

2GB 内存机器构建 Next.js 可能比较吃紧。如果构建被系统杀掉，可以临时添加 swap：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
free -h
```

永久启用 swap：

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 12. 用 PM2 启动 Next.js

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

本机检查：

```bash
curl -I http://127.0.0.1:3000
```

## 13. 配置 Nginx 反向代理

创建配置：

```bash
sudo nano /etc/nginx/sites-available/mshcode
```

写入：

```nginx
server {
  listen 80;
  server_name _;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/mshcode /etc/nginx/sites-enabled/mshcode
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

公网 IP 检查：

```bash
curl -I http://82.157.139.80
```

## 14. 部署后 smoke test

备案完成前用公网 IP 测：

```text
http://82.157.139.80/
http://82.157.139.80/demands
http://82.157.139.80/developers
http://82.157.139.80/rules/service
```

检查项：

- 首页返回 200
- 静态资源正常加载
- `/demands` 可打开
- `/developers` 可打开
- `/rules/service` 可打开
- Nginx 日志无大量 500

日志命令：

```bash
pm2 logs mshcode
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 15. 备案完成后的域名切换

备案完成后再执行：

1. DNS：把 `www.mshcode.com` 解析到腾讯云服务器公网 IP。
2. 修改服务器 `.env.production`：

```bash
NEXT_PUBLIC_APP_URL=https://www.mshcode.com
```

3. 重新构建并重启：

```bash
pnpm build
pm2 restart mshcode
```

4. Nginx `server_name` 改为：

```nginx
server_name mshcode.com www.mshcode.com;
```

5. 配置 HTTPS，可用腾讯云 SSL 证书或 Certbot。
6. Supabase Auth 中加入生产域名回调：

```text
https://www.mshcode.com
https://www.mshcode.com/auth/callback
```

## 16. 当前不要做

ICP备案完成前不要：

- 把 `www.mshcode.com` 解析到大陆服务器
- 对外宣布正式上线
- 接入真实支付
- 宣传资金托管、担保交易、保证退款、自动分账

真实支付未完成前不要：

- 设置 `PAYMENT_PROVIDER=wechat`
- 填写生产微信支付证书并开放入口
- 让用户在站内完成真实付款
