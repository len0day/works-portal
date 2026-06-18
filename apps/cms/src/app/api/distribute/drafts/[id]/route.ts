import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const STATUS_VALUES = ['draft', 'published', 'archived'] as const;

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

  const updates: Record<string, unknown> = {};
  if ('title' in body) updates.title = body.title == null ? null : String(body.title);
  if ('body' in body) updates.body = String(body.body ?? '');
  if ('tags' in body) {
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    updates.tags = tags;
  }
  if ('cover_url' in body) updates.cover_url = body.cover_url == null ? null : String(body.cover_url);
  if ('deeplink' in body) updates.deeplink = body.deeplink == null ? null : String(body.deeplink);

  // status 切换："我已发布" -> published_at = now(); 改回 draft -> 清空
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
    if (body.status === 'published') {
      updates.published_at = new Date();
    } else {
      updates.published_at = null;
    }
  }
  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_publish_drafts)
    .set(updates)
    .where(eq(schema.portal_publish_drafts.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'draft 不存在' }, { status: 404 });
  return NextResponse.json({ draft: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_publish_drafts)
    .where(eq(schema.portal_publish_drafts.id, id))
    .returning({ id: schema.portal_publish_drafts.id });
  if (!deleted) return NextResponse.json({ error: 'draft 不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
