#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-deploy}"
APP_ROOT="${APP_ROOT:-/var/www/mshcode}"
APP_DIR="${APP_DIR:-/var/www/mshcode/app}"

echo "==> Updating system packages"
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git unzip ca-certificates gnupg lsb-release ufw nginx

echo "==> Ensuring deploy user exists"
if ! id "$APP_USER" >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" "$APP_USER"
  sudo usermod -aG sudo "$APP_USER"
fi

echo "==> Creating project directories"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_ROOT"

echo "==> Configuring firewall"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

echo "==> Installing Node.js 20 LTS"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

echo "==> Enabling pnpm"
sudo corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

echo "==> Installing PM2"
sudo npm install -g pm2
pm2 -v

echo "==> Enabling Nginx"
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx --no-pager

echo "==> Done. Next: upload app files to $APP_DIR and create .env.production."
