import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const STATUS_VALUES = ['draft', 'published', 'archived'] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [item] = await db
    .select()
    .from(schema.portal_media)
    .where(eq(schema.portal_media.id, id))
    .limit(1);
  if (!item) return NextResponse.json({ error: 'media 不存在' }, { status: 404 });
  return NextResponse.json({ media: item });
}

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
  if ('type' in body && (body.type === 'image' || body.type === 'video')) updates.type = body.type;
  if ('url' in body) updates.url = String(body.url).trim();
  if ('thumbnail_url' in body) updates.thumbnail_url = body.thumbnail_url ? String(body.thumbnail_url) : null;
  if ('caption' in body) updates.caption = body.caption ? String(body.caption) : null;
  if ('sort_order' in body) updates.sort_order = Number(body.sort_order);
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
  }
  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_media)
    .set(updates)
    .where(eq(schema.portal_media.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'media 不存在' }, { status: 404 });
  return NextResponse.json({ media: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_media)
    .where(eq(schema.portal_media.id, id))
    .returning({ id: schema.portal_media.id });
  if (!deleted) return NextResponse.json({ error: 'media 不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
