# works-portal 部署指南

works-portal = CMS（Next.js，私有）+ Portal（Astro 静态，公开），共用 AiForKids 的 PostgreSQL。
部署形态：两个 Docker 容器接入 AiForKids 的 `aiforkids_aiforkids` 外部网络，由 `aiforkids-nginx` 反代 + mkcert 本地 HTTPS（生产走 Cloudflare Tunnel）。

## 目录

- [架构](#架构)
- [本地开发](#本地开发)
- [Docker 构建/运行](#docker-构建运行)
- [Nginx 路由](#nginx-路由)
- [证书管理](#证书管理)
- [发布后重建门户](#发布后重建门户)
- [CMS 私有访问](#cms-私有访问)
- [数据库备份](#数据库备份)
- [环境变量](#环境变量)

---

## 架构

```
                    ┌─────────────────────────────────────────────┐
                    │ aiforkids_aiforkids (external docker network)│
  公网/Cloudflare   │                                              │
       ───────────► aiforkids-nginx (80/443)                       │
                         │           │                            │
                         │ https     │ https                      │
                         ▼           ▼                            │
            portal.aiedutalk.online  cms.aiedutalk.online         │
                         │           │                            │
                         ▼           ▼                            │
              works-portal (80)   works-cms (3000)                │
              (Astro static)      (Next standalone)               │
                         │           │                            │
                         └─────┬─────┘                            │
                               ▼                                  │
                    aiforkids-postgres (5432)                     │
                    (库 learningai，宿主映射 5433)                 │
                    └─────────────────────────────────────────────┘
```

- **works-portal**：Astro 纯静态，构建期从 DB 拉已发布内容生成 `dist/`，由容器内 nginx 提供服务。
- **works-cms**：Next.js standalone，运行时连 DB，提供内容管理 API + 后台。
- 两个容器**不暴露宿主端口**，仅在内网通过 service name（`portal`/`cms`）被 nginx 反代。

## 本地开发

```bash
cd /Users/len/Projects/works-portal
pnpm install
# CMS（:3002）和 Portal（:4321）并行
pnpm dev
```

或单独：
```bash
pnpm --filter @works/cms dev      # http://localhost:3002
pnpm --filter @works/portal dev   # http://localhost:4321
```

DB 连接：`postgresql://learningai:password@localhost:5433/learningai`（AiForKids postgres 容器宿主映射）。

## Docker 构建/运行

前置：AiForKids 栈已 `docker compose up`（postgres + nginx + `aiforkids_aiforkids` 网络存在）。

```bash
cd /Users/len/Projects/works-portal

# 构建（首次较慢，约 3-5 分钟）
docker compose build

# 启动
docker compose up -d

# 查看日志
docker compose logs -f cms portal

# 重建单个服务
docker compose up -d --build portal
docker compose up -d --build cms
```

容器加入 `aiforkids_aiforkids` 外部网络后，在 AiForKids 侧 reload nginx 即可通过域名访问：
```bash
docker exec aiforkids-nginx nginx -t && docker exec aiforkids-nginx nginx -s reload
```

> **lockfile 不匹配**：若 M1-M5 加依赖后 lockfile 未更新，Dockerfile 会自动回退到 `--no-frozen-lockfile`。生产前建议本地 `pnpm install` 更新 lockfile 再提交。

## Nginx 路由

AiForKids 的 `aiforkids-nginx` 通过 `/etc/nginx/conf.d/*.conf` 加载站点配置：

| 文件 | 域名 | 上游 | 访问 |
|------|------|------|------|
| `portal.conf` | `portal.aiedutalk.online`, `www.aiedutalk.online` | `portal:80` | 公开 |
| `cms.conf` | `cms.aiedutalk.online` | `cms:3000` | 私有（IP 白名单） |
| `app.conf` | `localhost`, `admin/app.aiedutalk.online` | AiForKids 前端/后端 | - |

cms.conf 用 `allow/deny` 限制仅本机、Docker 内网（172.16/192.168/10.0）、家庭内网可访问，其余 `deny all`。

## 证书管理

本地开发证书用 [mkcert](https://github.com/FoxyProfiles/mkcert)，签发到 `/Users/len/Projects/AiForKids/cert/{cert,key}.pem`，nginx 容器挂载到 `/etc/nginx/ssl/`。

**重新签发（补充 SAN）**：
```bash
cd /Users/len/Projects/AiForKids/cert
mkcert -install   # 首次安装根证书
mkcert -cert-file cert.pem -key-file key.pem \
  localhost 127.0.0.1 \
  admin.aiedutalk.online app.aiedutalk.online \
  portal.aiedutalk.online cms.aiedutalk.online \
  www.aiedutalk.online

# 验证 SAN
openssl x509 -in cert.pem -noout -text | grep -A1 "Subject Alternative Name"

# reload nginx
docker exec aiforkids-nginx nginx -s reload
```

**生产**：aiedutalk.online 走 Cloudflare Tunnel，TLS 在 Cloudflare 边缘终止，本地 mkcert 仅用于内网直连与 Tunnel 后端校验。

## 发布后重建门户

Portal 是纯静态站点，CMS 发布内容后**不会自动反映**到门户，需重建 portal 容器。

### 方式 A（推荐）：本地脚本重建

```bash
cd /Users/len/Projects/works-portal
pnpm rebuild-portal
# 然后
docker compose up -d --build portal
```

`pnpm rebuild-portal` = `tsx apps/portal/scripts/fetch-cms.ts && pnpm --filter @works/portal build`（拉最新已发布内容 + 重新构建静态站点）。

### 方式 B：直接 docker rebuild

```bash
docker compose up -d --build portal
```

Dockerfile 构建期 `fetch-cms.ts` 会从 DB 拉已发布内容；DB 不可用时降级为空数组（站点仍可构建）。

### 自动化（后续增强）

Webhook 自动重建（CMS 发布后触发）标注为后续增强：可在 portal 容器用 supervisord 跑 nginx + tiny node webhook（监听 `/api/rebuild`，验 `PORTAL_REBUILD_SECRET` 后 exec rebuild）。当前为简化运维，采用手动重建。

## CMS 私有访问

CMS 仅在内网/白名单 IP 可访问。从本机：
```bash
# 加 hosts（mkcert 证书已含 cms.aiedutalk.online）
echo "127.0.0.1 cms.aiedutalk.online" | sudo tee -a /etc/hosts
open https://cms.aiedutalk.online
```

默认管理员：`admin@portal.local` / `admin123456`（**生产必须改 `PORTAL_ADMIN_PASSWORD`**）。

## 数据库备份

```bash
cd /Users/len/Projects/works-portal
./scripts/backup-db.sh              # 默认输出到 ./backups/
./scripts/backup-db.sh /path/to/dir # 指定目录
```

输出 `backups/learningai-YYYYMMDD-HHMMSS.sql.gz`。建议加入 crontab 定时：
```cron
0 3 * * * cd /Users/len/Projects/works-portal && ./scripts/backup-db.sh >> backups/cron.log 2>&1
```

恢复：
```bash
gunzip -c backups/learningai-XXXX.sql.gz | docker exec -i aiforkids-postgres psql -U learningai learningai
```

## 环境变量

CMS（`works-cms` 容器 / `apps/cms/.env.local`）：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PG 连接串（容器内 `postgres:5432`，本地 `localhost:5433`） | `postgresql://learningai:password@postgres:5432/learningai` |
| `PORTAL_JWT_SECRET` | 登录 JWT 签名密钥 | 随机 64 hex |
| `PORTAL_REBUILD_SECRET` | webhook 验证密钥（预留） | 随机 64 hex |
| `PORTAL_ADMIN_EMAIL` | 初始管理员邮箱 | `admin@portal.local` |
| `PORTAL_ADMIN_PASSWORD` | 初始管理员密码（**生产必改**） | - |

Portal（构建期，`apps/portal`）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 构建期 `fetch-cms.ts` 拉取已发布内容用；缺失则降级为空数组 |

`.env` 模板见仓库根 `.env.example`（如有）。**切勿提交真实密钥**。
