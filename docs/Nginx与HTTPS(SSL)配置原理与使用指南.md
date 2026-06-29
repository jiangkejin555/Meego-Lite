# Nginx 与 HTTPS(SSL) 配置原理与使用指南

本文档解释 Meego Lite 在阿里云服务器上使用 Nginx 反向代理与 HTTPS(SSL) 的原理，并说明 `Makefile` 中 `make nginx-prod`、`make ssl` 的实际作用与推荐使用方式。

适用场景：服务已部署在 ECS 上（PM2 启动应用，应用监听本机端口），期望仅通过 `https://www.meegolite.cn` 对外访问。

## 1. 整体架构（访问链路）

默认部署结构为：

1. 用户浏览器访问 `https://www.meegolite.cn`
2. 公网 DNS 将域名解析到 ECS 公网 IP
3. Nginx 在服务器上监听 443（HTTPS）或 80（HTTP）
4. Nginx 将请求反向代理到本机应用端口（默认 `127.0.0.1:3000`）
5. 应用处理请求并返回响应，再由 Nginx 回传给浏览器

关键点：

- 应用仅对本机监听（`127.0.0.1`），避免应用端口直接暴露公网
- 对公网提供访问的是 Nginx（80/443），由 Nginx 负责 TLS/SSL 加解密、域名匹配、静态缓存策略等

## 2. Nginx 的作用（为什么需要 Nginx）

Nginx 在这里主要承担：

- 统一入口：监听 80/443，对外提供 HTTP/HTTPS 服务
- 反向代理：将请求转发给本机应用端口（如 `127.0.0.1:3000`）
- TLS 终止：在 Nginx 层完成 HTTPS 握手与加密，后端应用使用普通 HTTP 即可
- 访问控制与性能优化：如静态资源缓存、gzip、上传大小限制等

## 3. HTTPS(SSL/TLS) 的原理（为什么访问 https 必须有证书）

当用户访问 `https://www.meegolite.cn` 时，浏览器会先与服务器进行 TLS 握手：

- 服务器必须提供一张对 `www.meegolite.cn` 有效的证书
- 浏览器会校验证书是否可信（CA 链是否完整）、域名是否匹配、是否过期
- 校验通过后，浏览器与服务器协商出加密通道密钥，后续 HTTP 请求在加密通道内传输（即 HTTPS）

如果服务器没有配置 443，或证书无效/不匹配，常见结果是：

- 浏览器报证书错误并阻止访问
- 直接连接失败（例如 443 未开放或未监听）

因此，HTTPS 的必要条件是：

- 域名解析正确（指向该服务器）
- 服务器 443 端口开放且由 Nginx 监听
- Nginx 配置了该域名对应的 `ssl_certificate` 与 `ssl_certificate_key`

## 4. Makefile 中的部署命令（你在执行什么）

本项目通过 `Makefile` 将 Nginx 配置与证书申请流程自动化。

### 4.1 `make nginx-prod` 做了什么

用途：配置并启用“HTTP(80) 站点 + 反代到本机应用端口”。

它会做：

1. 生成一份 Nginx 配置（包含 `server_name www.meegolite.cn`、反代 `127.0.0.1:3000`、静态缓存与 gzip 等）
2. 写入到 `/etc/nginx/sites-available/meego-lite`
3. 软链接到 `/etc/nginx/sites-enabled/` 使其生效
4. 执行 `nginx -t` 校验配置
5. `systemctl reload nginx` 热重载 Nginx

执行后，你至少应该能访问：

- `http://www.meegolite.cn`

注意：

- 该命令只负责 HTTP(80) 配置，不会自动启用 HTTPS(443)

### 4.2 `make ssl` 做了什么

用途：申请并配置 HTTPS 证书，使域名可通过 `https://` 访问。

它会做：

1. 先执行 `make nginx-prod`（确保 80 站点可用，便于证书校验）
2. 执行 `certbot --nginx -d www.meegolite.cn`
3. 执行 `certbot renew --dry-run` 验证续期流程

证书申请的关键点在于 ACME 校验（Let’s Encrypt 的标准流程）：

- `certbot --nginx` 会临时改写或注入 Nginx 规则，创建一个校验路径：
  - `http://www.meegolite.cn/.well-known/acme-challenge/...`
- Let’s Encrypt 会从公网访问这个 URL，以确认你确实控制了该域名并指向了这台服务器
- 校验通过后才会签发证书，并把证书存放到 `/etc/letsencrypt/live/...`
- certbot 会将 Nginx 配置更新为支持 443（并通常可选是否开启 80→443 跳转）

执行成功后，你应该能访问：

- `https://www.meegolite.cn`

## 5. 推荐使用方式（只使用 www.meegolite.cn）

前置条件（必须满足）：

- DNS：`www.meegolite.cn` A 记录指向 ECS 公网 IP
- 安全组/防火墙：放行 80 和 443 入站
- 本机应用端口可用：`curl -I http://127.0.0.1:3000` 返回正常响应（或至少有响应）

推荐执行顺序：

1. 如需先验证 HTTP：
   - `make nginx-prod`
   - 验证 `curl -I http://www.meegolite.cn`
2. 开启 HTTPS：
   - `make ssl`
   - 验证 `curl -I https://www.meegolite.cn`

如果你不关心 HTTP 阶段，通常可以直接执行：

- `make ssl`

原因是 `make ssl` 已经包含了 `make nginx-prod` 的步骤。

## 6. 常见问题与排查思路

### 6.1 `make ssl` 失败，常见原因

- DNS 未生效或指向错误：Let’s Encrypt 访问到的不是你的服务器
- 80 未开放：HTTP-01 校验需要公网能访问 80
- Nginx 未生效或站点冲突：有其他站点配置抢占了 `server_name www.meegolite.cn`
- 443 未开放：即使证书申请成功，浏览器也无法访问 https

### 6.2 快速验证命令（建议在服务器上执行）

- 验证域名解析是否指向本机：
  - `curl -I http://www.meegolite.cn`
- 验证本机应用是否在监听：
  - `curl -I http://127.0.0.1:3000`
- 验证 HTTPS 是否生效（证书是否可用）：
  - `curl -I https://www.meegolite.cn`
- 查看 Nginx 配置是否正确：
  - `sudo nginx -t`
- 查看 Nginx 日志（不同系统路径可能不同）：
  - `sudo tail -n 200 /var/log/nginx/error.log`
  - `sudo tail -n 200 /var/log/nginx/access.log`

## 7. 维护建议（续期与变更）

- Let’s Encrypt 证书需要定期续期，`certbot renew --dry-run` 通过通常意味着后续能自动续期
- 如果未来更换域名或增加子域名，需要重新执行 `make ssl`（或按 certbot 方式新增域名）
- 如果调整应用端口（默认 3000），需要同时更新 Nginx `proxy_pass` 指向，并重载 Nginx

