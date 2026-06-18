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
  const [feature] = await db
    .select()
    .from(schema.portal_features)
    .where(eq(schema.portal_features.id, id))
    .limit(1);
  if (!feature) return NextResponse.json({ error: 'feature 不存在' }, { status: 404 });
  return NextResponse.json({ feature });
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
    ['title', (v) => String(v).trim()],
    ['summary', (v) => (v == null || v === '' ? null : String(v))],
    ['detail', (v) => (v == null || v === '' ? null : String(v))],
    ['icon', (v) => (v == null || v === '' ? null : String(v))],
    ['sort_order', (v) => Number(v)],
  ];
  for (const [key, fn] of map) {
    if (key in body) updates[key] = fn(body[key]);
  }
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
  }
  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_features)
    .set(updates)
    .where(eq(schema.portal_features.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'feature 不存在' }, { status: 404 });
  return NextResponse.json({ feature: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_features)
    .where(eq(schema.portal_features.id, id))
    .returning({ id: schema.portal_features.id });
  if (!deleted) return NextResponse.json({ error: 'feature 不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
