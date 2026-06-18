import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { commitDraft } from '@works/parser';
import type { PortalDraft } from '@works/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {draft} → 幂等 upsert 入库。返回 commit 结果。 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  let body: { draft?: PortalDraft };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体非法 JSON' }, { status: 400 });
  }
  if (!body.draft) {
    return NextResponse.json({ error: 'draft 必填' }, { status: 400 });
  }

  try {
    const result = await commitDraft(body.draft);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
