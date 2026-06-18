import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Platform } from '@works/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORM_VALUES: Platform[] = ['xiaohongshu', 'wechat_mp', 'douyin'];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const platform = searchParams.get('platform');

  const conds = [];
  if (projectId) conds.push(eq(schema.portal_publish_drafts.project_id, projectId));
  if (platform && PLATFORM_VALUES.includes(platform as Platform)) {
    conds.push(eq(schema.portal_publish_drafts.platform, platform as Platform));
  }

  const drafts = await db
    .select()
    .from(schema.portal_publish_drafts)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.portal_publish_drafts.created_at));

  return NextResponse.json({ drafts });
}
