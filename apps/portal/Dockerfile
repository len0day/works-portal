# syntax=docker/dockerfile:1
# 多阶段构建：works-portal monorepo 的 Portal（Astro 纯静态）
# Build context 必须是 works-portal 根（见 docker-compose.yml）

# ---------- Stage 1: deps + build ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /repo

# workspace 元信息（层缓存）
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/cms/package.json apps/cms/
COPY apps/portal/package.json apps/portal/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/parser/package.json packages/parser/

RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# 复制全部源码
COPY . .

# 构建：含 fetch-cms（从 DATABASE_URL 拉数据），需构建期注入 DATABASE_URL
# 注意：仅用于 build 期；DB 不可用时 fetch-cms 会降级为空数组，站点仍可构建
ARG DATABASE_URL=postgresql://learningai:password@postgres:5432/learningai
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm --filter @works/portal build

# ---------- Stage 2: nginx 提供静态文件 ----------
FROM nginx:alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY apps/portal/nginx.container.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/portal/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
