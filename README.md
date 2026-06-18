# works-portal · 作品门户 + CMS + 多平台分发

集中展示开发者作品（小程序/产品）的介绍、技术亮点、版本更新，配套后台 CMS 管理内容，并半自动分发到小红书 / 微信公众号 / 抖音。

## 架构

| 模块 | 技术栈 | 说明 |
|---|---|---|
| `apps/portal` | Astro (static) | 公开门户，构建时从 DB 拉取已发布内容 |
| `apps/cms` | Next.js 15 (App Router, standalone) | 私有后台，独立认证 + 内容管理 + 分发编排 |
| `packages/parser` | Node.js | 扫描项目仓库自动解析为结构化草稿 |
| `packages/db` | Drizzle ORM + PostgreSQL | `portal_*` 表 schema / 迁移 / client |
| `packages/shared` | TypeScript | 三方共用类型契约 |

部署复用 AiForKids 的 PostgreSQL + Docker + Nginx + Cloudflare Tunnel 基建（同库 `learningai`，`portal_*` 前缀表）。**认证完全独立**（自建 `portal_admins`，不依赖 AiForKids 的 users/JWT）。

## 快速开始

```bash
cp .env.example .env          # 按需修改密钥
pnpm install                  # 安装依赖
pnpm db:generate              # 生成迁移 SQL
pnpm db:migrate               # 应用到 PostgreSQL
pnpm db:seed                  # 创建首个管理员
pnpm --filter @works/cms dev  # 启动后台 http://localhost:3002
pnpm --filter @works/portal dev  # 启动门户 http://localhost:4321
```

## 部署

容器化部署（CMS + Portal 两个容器接入 AiForKids 的 `aiforkids_aiforkids` 外部网络，由 `aiforkids-nginx` 反代）：

```bash
cd /Users/len/Projects/works-portal
docker compose build
docker compose up -d
# AiForKids 侧 reload nginx
docker exec aiforkids-nginx nginx -t && docker exec aiforkids-nginx nginx -s reload
```

- 门户：`https://portal.aiedutalk.online`（公开）
- CMS：`https://cms.aiedutalk.online`（私有，IP 白名单）
- CMS 发布内容后需重建门户：`pnpm rebuild-portal && docker compose up -d --build portal`
- 证书续签、备份、env 详见 [DEPLOY.md](./DEPLOY.md)。

## 多平台分发（合规）

只做「生成各平台格式文案 → 复制到剪贴板 / 唤起 App → 人工确认发布」。不调官方 API、不做 RPA、不存储平台账号。小红书/抖音无面向个人的开放发布 API，这是现实可行的合规上限。

详见 [实现计划](../../.claude/plans/soft-sprouting-spark.md)。
