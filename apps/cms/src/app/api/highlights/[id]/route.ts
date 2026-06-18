import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CATEGORY_VALUES } from '@/components/status-badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const STATUS_VALUES = ['draft', 'published', 'archived'] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [highlight] = await db
    .select()
    .from(schema.portal_highlights)
    .where(eq(schema.portal_highlights.id, id))
    .limit(1);
  if (!highlight) return NextResponse.json({ error: 'highlight 不存在' }, { status: 404 });
  return NextResponse.json({ highlight });
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
    ['metric_label', (v) => (v == null || v === '' ? null : String(v))],
    ['metric_value', (v) => (v == null || v === '' ? null : String(v))],
    ['body', (v) => (v == null || v === '' ? null : String(v))],
    ['sort_order', (v) => Number(v)],
  ];
  for (const [key, fn] of map) {
    if (key in body) updates[key] = fn(body[key]);
  }
  if ('category' in body && CATEGORY_VALUES.includes(body.category as (typeof CATEGORY_VALUES)[number])) {
    updates.category = body.category;
  }
  if ('status' in body && STATUS_VALUES.includes(body.status as (typeof STATUS_VALUES)[number])) {
    updates.status = body.status;
  }
  updates.updated_at = new Date();

  const [updated] = await db
    .update(schema.portal_highlights)
    .set(updates)
    .where(eq(schema.portal_highlights.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'highlight 不存在' }, { status: 404 });
  return NextResponse.json({ highlight: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(schema.portal_highlights)
    .where(eq(schema.portal_highlights.id, id))
    .returning({ id: schema.portal_highlights.id });
  if (!deleted) return NextResponse.json({ error: 'highlight 不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
