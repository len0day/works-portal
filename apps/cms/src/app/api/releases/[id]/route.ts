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
  const [release] = await db
    .select()
    .from(schema.portal_releases)
    .where(eq(schema.portal_releases.id, id))
    .limit(1);
  if (!release) return NextResponse.json({ error: 'release 不存在' }, { status: 404 });
  return NextResponse.json({ release });
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
  const map: Array<[string, (v: unknown) => unknown]> = [
    ['version', (v) => String(v).trim()],
    ['title', (v) => (v == null || v === '' ? null : String(v))],
    ['body', (v) => (v == null ? '' : String(v))],
    ['source_file', (v) => (v == null || v === '' ? null : String(v))],
    ['sort_order', (v) => Number(v)],
  ];
  for (const [key, fn] of map) {
    if (key in body) updates[key] = fn(body[key]);
  }
  if ('date' in body) {
    updates.date = body.date ? new Date(String(body.date)) : null;
  }
  if ('is_major' in body) updates.is_major = Boolean(body.is_major);
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
  }
  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_releases)
    .set(updates)
    .where(eq(schema.portal_releases.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'release 不存在' }, { status: 404 });
  return NextResponse.json({ release: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_releases)
    .where(eq(schema.portal_releases.id, id))
    .returning({ id: schema.portal_releases.id });
  if (!deleted) return NextResponse.json({ error: 'release 不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
