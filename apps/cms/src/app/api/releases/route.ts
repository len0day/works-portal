import { NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET 列表（支持 ?project_id= 过滤） */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  const releases = projectId
    ? await db
        .select()
        .from(schema.portal_releases)
        .where(eq(schema.portal_releases.project_id, projectId))
        .orderBy(desc(schema.portal_releases.date), asc(schema.portal_releases.sort_order))
    : await db
        .select()
        .from(schema.portal_releases)
        .orderBy(desc(schema.portal_releases.date), asc(schema.portal_releases.sort_order));

  return NextResponse.json({ releases });
}

/** POST 新建 release */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体非法 JSON' }, { status: 400 });
  }

  const projectId = String(body.project_id ?? '').trim();
  const version = String(body.version ?? '').trim();
  const releaseBody = body.body == null ? '' : String(body.body);
  if (!projectId || !version) {
    return NextResponse.json({ error: 'project_id / version 必填' }, { status: 400 });
  }
  const status = (body.status as 'draft' | 'published' | 'archived') ?? 'draft';

  const [created] = await db
    .insert(schema.portal_releases)
    .values({
      project_id: projectId,
      version,
      title: body.title ? String(body.title) : null,
      date: body.date ? new Date(String(body.date)) : null,
      body: releaseBody,
      source_file: body.source_file ? String(body.source_file) : null,
      is_major: Boolean(body.is_major),
      sort_order: Number(body.sort_order ?? 0),
      status,
    })
    .returning();

  return NextResponse.json({ release: created }, { status: 201 });
}
