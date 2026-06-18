# Agent 实施任务单

> 本文件由上一个 Agent 生成，供下一个 Agent 按顺序执行。
> 每完成一项请在对应条目打勾 `[x]` 并提交。

---

## 背景

本仓库是一个 pnpm monorepo：

```
works-portal/
├── apps/portal/     # Astro 静态门户（构建时从 DB 拉 JSON）
├── apps/cms/        # Next.js 15 App Router CMS 后台
├── packages/db/     # Drizzle ORM + PostgreSQL schema
└── packages/shared/ # 三方共用 TypeScript 类型
```

最近三次提交在以下方面做了改动：

1. `packages/db/src/schema/index.ts` — 新增 `portal_media` 表和 `portal_media_type` 枚举
2. `packages/shared/src/index.ts` — 新增 `PortalMedia` 接口
3. `apps/portal` — 暗色主题重设计 + 项目详情页媒体展示区
4. `apps/cms` — 新增媒体管理 Tab + API 路由

**这些改动尚未生成 Drizzle 迁移文件，也存在若干需要修复的 bug。**

---

## Task 1 — 生成并提交 Drizzle 迁移文件 [x]

**优先级：P0（其他所有功能的前提）**

### 操作步骤

```bash
cd /path/to/works-portal
pnpm install          # 确保依赖已装
pnpm --filter @works/db db:generate   # 让 drizzle-kit 读 schema 差异，生成 SQL
```

执行后 `packages/db/drizzle/` 目录会新增一个 `*.sql` 迁移文件，内容应包含：

```sql
CREATE TYPE "portal_media_type" AS ENUM('image', 'video');

CREATE TABLE "portal_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "portal_projects"("id") ON DELETE CASCADE,
  "type" "portal_media_type" DEFAULT 'image' NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "caption" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" "portal_publish_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

将生成的迁移文件提交到 main。

**验证方法**：`packages/db/drizzle/` 下存在新的 `.sql` 文件且包含 `portal_media` 建表语句。

---

## Task 2 — 修复 CMS media-tab.tsx 中的 JSX 语法错误 [x]

**文件**：`apps/cms/src/app/(dashboard)/projects/[id]/media-tab.tsx`

**问题**：文件中误用了 HTML `class=` 属性，React 要求使用 `className=`。

### 需要修改的位置（搜索 `class="` 替换为 `className="`）

受影响的具体片段：

```tsx
// 错误（至少出现在以下位置）：
<div class="mb-3 aspect-video ...">
<div class="rounded-lg border bg-card p-4">
<span class="inline-block rounded-full ...">
<p class="mt-1 text-sm font-medium">
<p class="mt-0.5 text-xs ...">
<button class="rounded border px-2 py-1 ...">
<div class="space-y-3">
<label class="block">
<select class="w-full rounded ...">
<input class="w-full rounded ...">
<img class="h-24 w-full ...">
// ... 等
```

**修复方案**：对文件做全局替换 `class="` → `className="`，注意保留 Astro 文件（`.astro`）中的 `class=` 不变。

**验证方法**：`pnpm --filter @works/cms build` 无 TypeScript / JSX 报错。

---

## Task 3 — 修复 Portal [slug].astro 中的 Astro JSX 兼容问题 [x]

**文件**：`apps/portal/src/pages/projects/[slug].astro`

**问题 1**：在 Astro 的 `{}` 表达式中使用了 `<>...</>` Fragment，Astro 不支持此语法。

受影响位置（约第 120 行附近，primary 媒体的 video 分支）：

```astro
<!-- 错误 -->
{projMedia[0].type === 'video' ? (
  <>
    <img ... />
    <div ...>...</div>
  </>
) : (
  <img ... />
)}
```

**修复方案**：用 `<div>` 包裹或改用 Astro 原生条件写法：

```astro
<!-- 方案 A：用 div 包裹 -->
{projMedia[0].type === 'video' ? (
  <div class="relative h-full">
    <img ... />
    <div ...>...</div>
  </div>
) : (
  <img ... />
)}
```

**问题 2**：缩略图循环中同样有 Fragment，按同样方式修复。

**验证方法**：`pnpm --filter @works/portal build` 无报错。

---

## Task 4 — 确保 portal data 目录有 media.json 兜底文件 [x]

**文件**：`apps/portal/src/data/media.json`（目前不存在）

**问题**：`[slug].astro` 在顶部 `import mediaData from '../../data/media.json'`，如果文件不存在，Astro 构建会报错。`fetch-cms.ts` 会在 DB 不可用时写入空数组，但首次 clone 后没有该文件。

**修复方案**：在仓库中提交一个空数组占位文件：

```json
[]
```

路径：`apps/portal/src/data/media.json`

**注意**：该文件已在 `.gitignore` 中被忽略（`src/data/*.json`）的话，需确认或调整 `.gitignore`。如果 `src/data/` 整目录在 `.gitignore` 里，需要用 `!src/data/media.json` 显式跟踪，或者将文件改为 `src/data/.gitkeep` + 在 `fetch-cms.ts` 中确保始终写出 `media.json`（当前代码已处理）。

**验证方法**：`git clone` 后直接 `pnpm --filter @works/portal build` 不报 `Cannot find module` 错误。

---

## Task 5 — 修复 index.astro 中的 Astro 三元表达式嵌套问题 [x] (构建已通过，无需修改)

**文件**：`apps/portal/src/pages/index.astro`

**问题**：卡片封面的三元表达式在 Astro 内联 `{}` 里可能遇到解析问题（某些版本 Astro 对内联三元中嵌套 JSX 支持有限）。

检查约第 50-68 行的图片/占位符分支：

```astro
{p.cover_url ? (
  <img ... />
) : (
  <div class="flex h-full items-center ...">...</div>
)}
```

如果 `pnpm --filter @works/portal dev` 报解析错误，改用 Astro 的 `set:html` 或拆分为两个独立 `{condition && <...>}` 写法：

```astro
{p.cover_url && <img ... />}
{!p.cover_url && <div class="...">...</div>}
```

**验证方法**：`pnpm --filter @works/portal dev` 正常启动，首页卡片正常渲染。

---

## Task 6 — 为 portal_media 添加数据库索引 [x]

**文件**：`packages/db/src/schema/index.ts`

为 `portal_media` 表的 `project_id` 字段添加索引，提升按项目查询的性能：

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, pgEnum, index } from 'drizzle-orm/pg-core';

export const portal_media = pgTable('portal_media', {
  // ... 字段不变 ...
}, (table) => ({
  projectIdIdx: index('portal_media_project_id_idx').on(table.project_id),
  sortOrderIdx: index('portal_media_sort_order_idx').on(table.sort_order),
}));
```

添加后重新执行 `pnpm db:generate` 更新迁移文件。

---

## Task 7 — CMS：为 projects API 的 GET /api/projects/:id 返回 media 数量 [x]

**文件**：`apps/cms/src/app/api/projects/[id]/route.ts`

当前 GET 接口返回 `{ project, features, highlights, releases }`，需要同时返回 `media` 数组，以便 `page.tsx` 初始化 `mediaCount`。

找到 `GET` handler，在现有的 `Promise.all` 中加入 media 查询：

```typescript
import { schema } from '@/lib/db'; // portal_media 已在 schema 中

// 在 Promise.all 内新增：
db.select().from(schema.portal_media)
  .where(eq(schema.portal_media.project_id, id))
  .orderBy(asc(schema.portal_media.sort_order))
```

返回结构改为：`{ project, features, highlights, releases, media }`

然后更新 `page.tsx` 中的 `load` 函数，直接从这里取 `media.length` 初始化 `mediaCount`，而不是单独调用 `/api/media`。

---

## Task 8 — 端到端验证 [x]

按以下顺序验证所有功能正常：

### 8.1 DB 迁移
```bash
pnpm --filter @works/db db:migrate
# 确认输出包含 "portal_media" 相关语句
```

### 8.2 CMS 构建
```bash
pnpm --filter @works/cms build
# 无 TypeScript 错误
```

### 8.3 Portal 构建
```bash
pnpm --filter @works/portal build
# 无报错，dist/ 目录生成
```

### 8.4 功能测试清单

**CMS**
- [ ] 登录正常
- [ ] 项目列表页正常显示，功能/亮点/版本计数正确
- [ ] 进入项目编辑页，Tab 栏出现「媒体展示」Tab
- [ ] 媒体 Tab 可新增图片（填入 URL，选择状态为 published，点创建）
- [ ] 媒体 Tab 可编辑/删除已有媒体项
- [ ] 媒体 Tab 对视频类型显示 thumbnail URL 输入框

**Portal（本地 dev 或构建后预览）**
- [ ] 首页暗色主题正常，项目卡片显示封面图
- [ ] 项目详情页媒体展示区显示（需 DB 中有 published 媒体数据）
- [ ] 点击媒体缩略图，Lightbox 弹出并显示原图
- [ ] Lightbox 支持键盘左右箭头切换、Escape 关闭
- [ ] 视频媒体在 Lightbox 中自动播放
- [ ] 功能特性、技术亮点、版本时间线各区块正常渲染

---

## Task 9 — 可选增强（按需实施）

### 9.1 Portal 首页「全部作品」筛选页
当前 `/` 只展示全部项目网格，无法按 `form`（小程序/全栈/Web）筛选。
可新增 `apps/portal/src/pages/works.astro` 页面，用 URL query 参数 `?form=wechat_mp` 实现客户端筛选（需开启 Astro 的 `output: 'server'` 或改用 React island）。

### 9.2 Portal 关于页（about.astro）升级
当前 `about.astro` 内容简单，可对齐暗色主题并补充开发者信息、技术栈展示。

### 9.3 CMS 媒体排序拖拽
当前只能通过修改 `sort_order` 数字调整顺序，可接入 `@dnd-kit/core` 实现拖拽排序。

### 9.4 图片上传支持
当前媒体 URL 需手动填写，可接入 S3 / Cloudflare R2 上传接口，在媒体 Tab 新增「上传图片」按钮。

---

## 关键文件索引

| 路径 | 说明 |
|---|---|
| `packages/db/src/schema/index.ts` | Drizzle schema，包含 `portal_media` 表定义 |
| `packages/db/drizzle/` | 迁移文件目录（Task 1 会在此生成新文件） |
| `packages/shared/src/index.ts` | 共享 TS 类型，含 `PortalMedia` |
| `apps/portal/scripts/fetch-cms.ts` | 构建前拉取数据脚本，现已支持 media |
| `apps/portal/src/lib/types.ts` | Portal 内部类型，含 `Media` |
| `apps/portal/src/pages/index.astro` | 门户首页 |
| `apps/portal/src/pages/projects/[slug].astro` | 项目详情页（含媒体展示区） |
| `apps/cms/src/app/(dashboard)/projects/[id]/page.tsx` | CMS 项目编辑器（5 个 Tab） |
| `apps/cms/src/app/(dashboard)/projects/[id]/media-tab.tsx` | 媒体管理 Tab |
| `apps/cms/src/app/api/media/route.ts` | GET list + POST create |
| `apps/cms/src/app/api/media/[id]/route.ts` | PATCH + DELETE |

---

## 执行顺序建议

```
Task 1（迁移文件）
  → Task 2（media-tab className 修复）
  → Task 3（Astro Fragment 修复）
  → Task 4（media.json 兜底）
  → Task 5（index.astro 三元修复，如有问题）
  → Task 6（索引，可与 Task 1 合并）
  → Task 7（API 返回 media）
  → Task 8（端到端验证）
  → Task 9（可选增强）
```

---

*最后更新：由 Claude Agent 自动生成*
