import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/media?project_id= */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  const media = projectId
    ? await db
        .select()
        .from(schema.portal_media)
        .where(eq(schema.portal_media.project_id, projectId))
        .orderBy(asc(schema.portal_media.sort_order), asc(schema.portal_media.created_at))
    : await db
        .select()
        .from(schema.portal_media)
        .orderBy(asc(schema.portal_media.sort_order), asc(schema.portal_media.created_at));

  return NextResponse.json({ media });
}

/** POST /api/media */
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
  const url = String(body.url ?? '').trim();
  if (!projectId || !url) {
    return NextResponse.json({ error: 'project_id / url 必填' }, { status: 400 });
  }

  const type = body.type === 'video' ? 'video' : 'image';
  const status = (['draft', 'published', 'archived'] as const).includes(body.status as 'draft')
    ? (body.status as 'draft' | 'published' | 'archived')
    : 'draft';

  const [created] = await db
    .insert(schema.portal_media)
    .values({
      project_id: projectId,
      type,
      url,
      thumbnail_url: body.thumbnail_url ? String(body.thumbnail_url) : null,
      caption: body.caption ? String(body.caption) : null,
      sort_order: Number(body.sort_order ?? 0),
      status,
    })
    .returning();

  return NextResponse.json({ media: created }, { status: 201 });
}
