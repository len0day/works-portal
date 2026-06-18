import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CATEGORY_VALUES } from '@/components/status-badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_VALUES = ['draft', 'published', 'archived'] as const;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  const highlights = projectId
    ? await db
        .select()
        .from(schema.portal_highlights)
        .where(eq(schema.portal_highlights.project_id, projectId))
        .orderBy(asc(schema.portal_highlights.sort_order), asc(schema.portal_highlights.created_at))
    : await db
        .select()
        .from(schema.portal_highlights)
        .orderBy(asc(schema.portal_highlights.sort_order), asc(schema.portal_highlights.created_at));

  return NextResponse.json({ highlights });
}

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
  const category: 'performance' | 'architecture' | 'i18n' | 'ai' | 'feature' | 'fix' =
    'category' in body && CATEGORY_VALUES.includes(body.category as (typeof CATEGORY_VALUES)[number])
      ? (body.category as (typeof CATEGORY_VALUES)[number])
      : 'feature';
  const status = (body.status as (typeof STATUS_VALUES)[number]) ?? 'draft';

  const [created] = await db
    .insert(schema.portal_highlights)
    .values({
      project_id: projectId,
      title,
      metric_label: body.metric_label ? String(body.metric_label) : null,
      metric_value: body.metric_value ? String(body.metric_value) : null,
      body: body.body ? String(body.body) : null,
      category,
      sort_order: Number(body.sort_order ?? 0),
      status,
    })
    .returning();

  return NextResponse.json({ highlight: created }, { status: 201 });
}
