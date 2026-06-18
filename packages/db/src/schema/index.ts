import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  index,
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
export const mediaType = pgEnum('portal_media_type', ['image', 'video']);

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
  slug: text('slug').notNull().unique(),
  code: text('code').notNull().unique(),
  display_name: text('display_name').notNull(),
  display_name_en: text('display_name_en'),
  tagline: text('tagline'),
  form: projectForm('form').notNull().default('other'),
  description: text('description'),
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
  source_path: text('source_path'),
  raw_meta: jsonb('raw_meta'),
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
  detail: text('detail'),
  icon: text('icon'),
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
  metric_label: text('metric_label'),
  metric_value: text('metric_value'),
  body: text('body'),
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
  version: text('version').notNull(),
  title: text('title'),
  date: timestamp('date', tz),
  body: text('body').notNull(),
  source_file: text('source_file'),
  is_major: boolean('is_major').default(false),
  status: publishStatus('status').notNull().default('draft'),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

/** 项目媒体资源（图片 / 视频） */
export const portal_media = pgTable('portal_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  type: mediaType('type').notNull().default('image'),
  url: text('url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  caption: text('caption'),
  sort_order: integer('sort_order').notNull().default(0),
  status: publishStatus('status').notNull().default('draft'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (table) => ({
  projectIdIdx: index('portal_media_project_id_idx').on(table.project_id),
  sortOrderIdx: index('portal_media_sort_order_idx').on(table.sort_order),
}));

/** 多平台发布草稿（半自动分发） */
export const portal_publish_drafts = pgTable('portal_publish_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => portal_projects.id, { onDelete: 'cascade' }),
  release_id: uuid('release_id').references(() => portal_releases.id, { onDelete: 'set null' }),
  platform: platformEnum('platform').notNull(),
  title: text('title'),
  body: text('body').notNull(),
  tags: text('tags').array(),
  cover_url: text('cover_url'),
  deeplink: text('deeplink'),
  status: publishStatus('status').notNull().default('draft'),
  published_at: timestamp('published_at', tz),
  generation_meta: jsonb('generation_meta'),
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
export type PortalMedia = typeof portal_media.$inferSelect;
export type NewPortalMedia = typeof portal_media.$inferInsert;
export type PortalPublishDraft = typeof portal_publish_drafts.$inferSelect;
