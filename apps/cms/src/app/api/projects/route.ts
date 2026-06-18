import { NextResponse } from 'next/server';
import { asc, count, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET 项目列表（每项目带 features/highlights/releases 计数，N+1 查询，数据量小可接受）。 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  const q = db
    .select({
      id: schema.portal_projects.id,
      slug: schema.portal_projects.slug,
      code: schema.portal_projects.code,
      display_name: schema.portal_projects.display_name,
      display_name_en: schema.portal_projects.display_name_en,
      tagline: schema.portal_projects.tagline,
      form: schema.portal_projects.form,
      icon_url: schema.portal_projects.icon_url,
      cover_url: schema.portal_projects.cover_url,
      current_version: schema.portal_projects.current_version,
      status: schema.portal_projects.status,
      sort_order: schema.portal_projects.sort_order,
      released_at: schema.portal_projects.released_at,
      updated_at: schema.portal_projects.updated_at,
    })
    .from(schema.portal_projects)
    .orderBy(asc(schema.portal_projects.sort_order), desc(schema.portal_projects.created_at));

  const rows = projectId ? await q.where(eq(schema.portal_projects.id, projectId)) : await q;

  const [fRows, hRows, rRows] = await Promise.all([
    db
      .select({ project_id: schema.portal_features.project_id, n: count() })
      .from(schema.portal_features)
      .groupBy(schema.portal_features.project_id),
    db
      .select({ project_id: schema.portal_highlights.project_id, n: count() })
      .from(schema.portal_highlights)
      .groupBy(schema.portal_highlights.project_id),
    db
      .select({ project_id: schema.portal_releases.project_id, n: count() })
      .from(schema.portal_releases)
      .groupBy(schema.portal_releases.project_id),
  ]);

  const toMap = (arr: Array<{ project_id: string | null; n: number }>) =>
    new Map(arr.filter((x) => x.project_id).map((x) => [x.project_id as string, Number(x.n)]));
  const fMap = toMap(fRows);
  const hMap = toMap(hRows);
  const rMap = toMap(rRows);

  const projects = rows.map((r) => ({
    ...r,
    features_count: fMap.get(r.id) ?? 0,
    highlights_count: hMap.get(r.id) ?? 0,
    releases_count: rMap.get(r.id) ?? 0,
  }));

  return NextResponse.json({ projects });
}

/** POST 新建项目 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体非法 JSON' }, { status: 400 });
  }

  const code = String(body.code ?? '').trim();
  const slug = String(body.slug ?? '').trim();
  const displayName = String(body.display_name ?? '').trim();
  if (!code || !slug || !displayName) {
    return NextResponse.json({ error: 'code / slug / display_name 必填' }, { status: 400 });
  }

  // 唯一性校验
  const [dupCode] = await db
    .select({ id: schema.portal_projects.id })
    .from(schema.portal_projects)
    .where(eq(schema.portal_projects.code, code))
    .limit(1);
  if (dupCode) return NextResponse.json({ error: 'code 已存在' }, { status: 409 });

  const [dupSlug] = await db
    .select({ id: schema.portal_projects.id })
    .from(schema.portal_projects)
    .where(eq(schema.portal_projects.slug, slug))
    .limit(1);
  if (dupSlug) return NextResponse.json({ error: 'slug 已存在' }, { status: 409 });

  const form = (body.form as 'wechat_mp' | 'fullstack' | 'website' | 'other') ?? 'other';
  const status = (body.status as 'draft' | 'published' | 'archived') ?? 'draft';
  const techStack = Array.isArray(body.tech_stack) ? body.tech_stack.map(String) : null;

  const [created] = await db
    .insert(schema.portal_projects)
    .values({
      code,
      slug,
      display_name: displayName,
      display_name_en: body.display_name_en ? String(body.display_name_en) : null,
      tagline: body.tagline ? String(body.tagline) : null,
      form,
      description: body.description ? String(body.description) : null,
      description_en: body.description_en ? String(body.description_en) : null,
      icon_url: body.icon_url ? String(body.icon_url) : null,
      cover_url: body.cover_url ? String(body.cover_url) : null,
      repo_url: body.repo_url ? String(body.repo_url) : null,
      homepage_url: body.homepage_url ? String(body.homepage_url) : null,
      tech_stack: techStack,
      status,
      sort_order: Number(body.sort_order ?? 0),
      current_version: body.current_version ? String(body.current_version) : null,
      source_path: body.source_path ? String(body.source_path) : null,
      raw_meta: (body.raw_meta as Record<string, unknown>) ?? null,
    })
    .returning();

  return NextResponse.json({ project: created }, { status: 201 });
}
