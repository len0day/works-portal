import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
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

  const features = projectId
    ? await db
        .select()
        .from(schema.portal_features)
        .where(eq(schema.portal_features.project_id, projectId))
        .orderBy(asc(schema.portal_features.sort_order), asc(schema.portal_features.created_at))
    : await db
        .select()
        .from(schema.portal_features)
        .orderBy(asc(schema.portal_features.sort_order), asc(schema.portal_features.created_at));

  return NextResponse.json({ features });
}

/** POST 新建 feature */
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
  const title = String(body.title ?? '').trim();
  if (!projectId || !title) {
    return NextResponse.json({ error: 'project_id / title 必填' }, { status: 400 });
  }
  const status = (body.status as 'draft' | 'published' | 'archived') ?? 'draft';

  const [created] = await db
    .insert(schema.portal_features)
    .values({
      project_id: projectId,
      title,
      summary: body.summary ? String(body.summary) : null,
      detail: body.detail ? String(body.detail) : null,
      icon: body.icon ? String(body.icon) : null,
      sort_order: Number(body.sort_order ?? 0),
      status,
    })
    .returning();

  return NextResponse.json({ feature: created }, { status: 201 });
}
