# 大宋百商图 - 阿里云一键部署文档

> 本文档供 AI Agent 在阿里云服务器上逐步执行，完成从零到域名可访问的全流程部署。
> 前提：服务器已有 git 环境。

## 前置信息

```
域名: xieyi1998.top
Git 仓库地址: https://github.com/xieyi123456/song-merchant
服务器公网 IP: ________（部署时填入）
```

---

## Step 0: 配置阿里云 DNS 解析（在浏览器操作，非服务器）

域名必须先解析到服务器 IP 才能访问，这一步要在阿里云控制台操作：

1. 登录 [阿里云域名控制台](https://dc.console.aliyun.com/next/index#/domain-list)
2. 找到 `xieyi1998.top`，点击 **解析**
3. 添加以下两条记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | `<服务器公网IP>` | 10分钟 |
| A | www | `<服务器公网IP>` | 10分钟 |

4. 等待 1-5 分钟生效，验证：`ping xieyi1998.top` 应返回服务器 IP

> **注意**：此步骤必须在服务器操作之前完成，否则后续 HTTPS 证书申请会失败。
> **同时检查阿里云安全组**：入方向放行 80、443、22 端口。

---

## Step 1: 安装基础依赖

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Nginx
sudo apt update
sudo apt install -y nginx

# 安装 PM2
sudo npm install -g pm2

# 安装 certbot（用于 HTTPS）
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: 拉取代码并构建

```bash
sudo mkdir -p /opt/song-merchant
sudo chown $USER:$USER /opt/song-merchant
git clone https://github.com/xieyi123456/song-merchant.git /opt/song-merchant
cd /opt/song-merchant
npm install
npm run build
```

构建完成后验证产物存在：
- `packages/client/dist/index.html` （前端）
- `packages/server/dist/index.js` （后端）

## Step 3: 创建 PM2 配置并启动后端

```bash
mkdir -p /opt/song-merchant/logs

cat > /opt/song-merchant/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'song-merchant-server',
    cwd: '/opt/song-merchant',
    script: 'packages/server/dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/opt/song-merchant/logs/error.log',
    out_file: '/opt/song-merchant/logs/out.log'
  }]
};
EOF

cd /opt/song-merchant
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

执行 `pm2 startup` 后会输出一条 `sudo env PATH=...` 命令，**直接复制执行该命令**实现开机自启。

验证后端运行：
```bash
pm2 status
# song-merchant-server 状态应为 online
```

## Step 4: 配置 Nginx

```bash
sudo tee /etc/nginx/sites-available/song-merchant > /dev/null << 'EOF'
server {
    listen 80;
    server_name xieyi1998.top www.xieyi1998.top;

    root /opt/song-merchant/packages/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
EOF

sudo ln -sf /etc/nginx/sites-available/song-merchant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Step 5: 配置 HTTPS

```bash
sudo certbot --nginx -d xieyi1998.top -d www.xieyi1998.top
# 按提示：输入邮箱 → 同意条款 → 选择是否重定向 HTTP 到 HTTPS（选是，输入 2）
sudo certbot renew --dry-run
```

## Step 6: 防火墙

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## Step 7: 验证

```bash
# 1. 后端进程在线
pm2 status

# 2. Nginx 正常
sudo systemctl status nginx

# 3. 域名可访问
curl -I https://xieyi1998.top
```

浏览器打开 **https://xieyi1998.top** 应能看到游戏页面。

---

## 日常更新

```bash
cd /opt/song-merchant
git pull origin main
npm install
npm run build
pm2 restart song-merchant-server
```

## 故障排查

| 问题 | 排查命令 |
|------|---------|
| 页面打不开 | `sudo systemctl status nginx` / `sudo nginx -t` |
| WebSocket 断开 | `pm2 logs song-merchant-server` |
| 白屏/路由 404 | 检查 Nginx `try_files` 配置 |
| 更新后没变化 | `npm run build` 后 `pm2 restart song-merchant-server` |
| HTTPS 证书过期 | `sudo certbot renew` |
