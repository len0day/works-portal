# syntax=docker/dockerfile:1
# 多阶段构建：works-portal monorepo 的 CMS（Next.js standalone）
# Build context 必须是 works-portal 根（见 docker-compose.yml）

# ---------- Stage 1: deps + build ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /repo

# 先复制 workspace 元信息，利用 docker 层缓存安装依赖
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/cms/package.json apps/cms/
COPY apps/portal/package.json apps/portal/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/parser/package.json packages/parser/

# 安装依赖（若 lockfile 不匹配改用 --no-frozen-lockfile）
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# 复制全部源码
COPY . .

# 仅构建 CMS（Next.js standalone 会把所需 monorepo 依赖打进 .next/standalone）
RUN pnpm --filter @works/cms build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone 产物已含最小 node_modules，复制 server + static + public
COPY --from=builder /repo/apps/cms/.next/standalone ./
COPY --from=builder /repo/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=builder /repo/apps/cms/public ./apps/cms/public

# standalone server 入口在 apps/cms/server.js，由 PORT 环境变量控制端口
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/cms/server.js"]
