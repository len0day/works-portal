import { NextResponse } from 'next/server';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET 项目详情（含 features/highlights/releases 数组） */
export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [project] = await db
    .select()
    .from(schema.portal_projects)
    .where(eq(schema.portal_projects.id, id))
    .limit(1);
  if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });

  const [features, highlights, releases, media] = await Promise.all([
    db
      .select()
      .from(schema.portal_features)
      .where(eq(schema.portal_features.project_id, id))
      .orderBy(asc(schema.portal_features.sort_order), asc(schema.portal_features.created_at)),
    db
      .select()
      .from(schema.portal_highlights)
      .where(eq(schema.portal_highlights.project_id, id))
      .orderBy(asc(schema.portal_highlights.sort_order), asc(schema.portal_highlights.created_at)),
    db
      .select()
      .from(schema.portal_releases)
      .where(eq(schema.portal_releases.project_id, id))
      .orderBy(asc(schema.portal_releases.sort_order), desc(schema.portal_releases.date)),
    db
      .select()
      .from(schema.portal_media)
      .where(eq(schema.portal_media.project_id, id))
      .orderBy(asc(schema.portal_media.sort_order), asc(schema.portal_media.created_at)),
  ]);

  return NextResponse.json({ project, features, highlights, releases, media });
}

const FORM_VALUES = ['wechat_mp', 'fullstack', 'website', 'other'] as const;
const STATUS_VALUES = ['draft', 'published', 'archived'] as const;

/** PATCH 更新任意字段 */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体非法 JSON' }, { status: 400 });
  }

  // slug 唯一（除自身）
  if (typeof body.slug === 'string' && body.slug.trim()) {
    const [dup] = await db
      .select({ id: schema.portal_projects.id })
      .from(schema.portal_projects)
      .where(and(eq(schema.portal_projects.slug, body.slug), ne(schema.portal_projects.id, id)))
      .limit(1);
    if (dup) return NextResponse.json({ error: 'slug 已被其他项目占用' }, { status: 409 });
  }

  const updates: Record<string, unknown> = {};
  const map: Array<[string, (v: unknown) => unknown]> = [
    ['slug', (v) => String(v).trim()],
    ['code', (v) => String(v).trim()],
    ['display_name', (v) => String(v).trim()],
    ['display_name_en', (v) => (v == null || v === '' ? null : String(v))],
    ['tagline', (v) => (v == null || v === '' ? null : String(v))],
    ['description', (v) => (v == null || v === '' ? null : String(v))],
    ['description_en', (v) => (v == null || v === '' ? null : String(v))],
    ['icon_url', (v) => (v == null || v === '' ? null : String(v))],
    ['cover_url', (v) => (v == null || v === '' ? null : String(v))],
    ['repo_url', (v) => (v == null || v === '' ? null : String(v))],
    ['homepage_url', (v) => (v == null || v === '' ? null : String(v))],
    ['current_version', (v) => (v == null || v === '' ? null : String(v))],
    ['sort_order', (v) => Number(v)],
  ];
  for (const [key, fn] of map) {
    if (key in body) updates[key] = fn(body[key]);
  }
  if ('form' in body && FORM_VALUES.includes(body.form as (typeof FORM_VALUES)[number])) {
    updates.form = body.form;
  }
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
  }
  if ('tech_stack' in body) {
    updates.tech_stack = Array.isArray(body.tech_stack) ? body.tech_stack.map(String) : null;
  }
  if ('released_at' in body) {
    updates.released_at = body.released_at ? new Date(String(body.released_at)) : null;
  }

  // 发布联动：项目改为 published 时，把该项目当前 draft 的子表（features/highlights/releases）
  // 一并置为 published。改为 archived 时不联动（保留子表原状态）。
  if (updates.status === 'published') {
    const draftCond = and(eq(schema.portal_features.project_id, id), eq(schema.portal_features.status, 'draft'));
    await Promise.all([
      db.update(schema.portal_features).set({ status: 'published', updated_at: new Date() }).where(draftCond),
      db
        .update(schema.portal_highlights)
        .set({ status: 'published', updated_at: new Date() })
        .where(and(eq(schema.portal_highlights.project_id, id), eq(schema.portal_highlights.status, 'draft'))),
      db
        .update(schema.portal_releases)
        .set({ status: 'published', updated_at: new Date() })
        .where(and(eq(schema.portal_releases.project_id, id), eq(schema.portal_releases.status, 'draft'))),
    ]);
  }

  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_projects)
    .set(updates)
    .where(eq(schema.portal_projects.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: '项目不存在' }, { status: 404 });

  return NextResponse.json({ project: updated });
}

/** DELETE 级联（schema 已 ON DELETE CASCADE） */
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_projects)
    .where(eq(schema.portal_projects.id, id))
    .returning({ id: schema.portal_projects.id });
  if (!deleted) return NextResponse.json({ error: '项目不存在' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
