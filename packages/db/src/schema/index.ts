import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// 枚举（均带 portal_ 前缀，避免与 AiForKids 同库冲突）
export const publishStatus = pgEnum('portal_publish_status', ['draft', 'published', 'archived']);
export const projectForm = pgEnum('portal_project_form', ['wechat_mp', 'fullstack', 'website', 'other']);
export const platformEnum = pgEnum('portal_platform', ['xiaohongshu', 'wechat_mp', 'douyin']);
export const highlightCategory = pgEnum('portal_highlight_category', [
  'performance',
  'architecture',
  'i18n',
  'ai',
  'feature',
  'fix',
]);
export const adminRole = pgEnum('portal_admin_role', ['admin', 'editor']);

// 时间戳工厂：UUIDBase 约定（带时区 + 自动 now/更新）
const tz = { withTimezone: true, mode: 'date' } as const;
const createdAt = () => timestamp('created_at', tz).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', tz).defaultNow().notNull();

/** 独立管理员账号体系（与 AiForKids 的 users 表无任何关联） */
export const portal_admins = pgTable('portal_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name'),
  role: adminRole('role').notNull().default('editor'),
  last_login_at: timestamp('last_login_at', tz),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 项目 / 作品 */
export const portal_projects = pgTable('portal_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // URL 友好，如 wechat-video-downloader
  code: text('code').notNull().unique(), // 仓库代号，如 WeChatVideoDownloader
  display_name: text('display_name').notNull(), // 展示名，如 云视仓
  display_name_en: text('display_name_en'),
  tagline: text('tagline'), // 一句话简介
  form: projectForm('form').notNull().default('other'),
  description: text('description'), // markdown
  description_en: text('description_en'),
  icon_url: text('icon_url'),
  cover_url: text('cover_url'),
  repo_url: text('repo_url'),
  homepage_url: text('homepage_url'),
  tech_stack: text('tech_stack').array(),
  status: publishStatus('status').notNull().default('draft'),
  sort_order: integer('sort_order').notNull().default(0),
  current_version: text('current_version'),
  released_at: timestamp('released_at', tz),
  source_path: text('source_path'), // 本地仓库路径（解析器用）
  raw_meta: jsonb('raw_meta'), // 解析器原始输出留底
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 核心功能点 */
export const portal_features = pgTable('portal_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  detail: text('detail'), // markdown
  icon: text('icon'), // emoji 或 lucide 图标名
  sort_order: integer('sort_order').notNull().default(0),
  status: publishStatus('status').notNull().default('draft'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 技术亮点（带可量化指标） */
export const portal_highlights = pgTable('portal_highlights', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  metric_label: text('metric_label'), // 如 "内存占用"
  metric_value: text('metric_value'), // 如 "↓75%"
  body: text('body'), // markdown 技术说明
  category: highlightCategory('category').notNull().default('feature'),
  sort_order: integer('sort_order').notNull().default(0),
  status: publishStatus('status').notNull().default('draft'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 版本更新日志 */
export const portal_releases = pgTable('portal_releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  version: text('version').notNull(), // 如 4.0.0
  title: text('title'),
  date: timestamp('date', tz),
  body: text('body').notNull(), // markdown
  source_file: text('source_file'), // 如 RELEASE_NOTES_3.2.2.md
  is_major: boolean('is_major').default(false),
  status: publishStatus('status').notNull().default('draft'),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 多平台发布草稿（半自动分发） */
export const portal_publish_drafts = pgTable('portal_publish_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  release_id: uuid('release_id').references(() => portal_releases.id, { onDelete: 'set null' }),
  platform: platformEnum('platform').notNull(),
  title: text('title'),
  body: text('body').notNull(), // 已格式化的平台文案
  tags: text('tags').array(),
  cover_url: text('cover_url'),
  deeplink: text('deeplink'),
  status: publishStatus('status').notNull().default('draft'),
  published_at: timestamp('published_at', tz), // 人工确认发布的时间
  generation_meta: jsonb('generation_meta'), // {template, llm}
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export type PortalAdmin = typeof portal_admins.$inferSelect;
export type NewPortalAdmin = typeof portal_admins.$inferInsert;
export type PortalProject = typeof portal_projects.$inferSelect;
export type NewPortalProject = typeof portal_projects.$inferInsert;
export type PortalFeature = typeof portal_features.$inferSelect;
export type PortalHighlight = typeof portal_highlights.$inferSelect;
export type PortalRelease = typeof portal_releases.$inferSelect;
export type PortalPublishDraft = typeof portal_publish_drafts.$inferSelect;
