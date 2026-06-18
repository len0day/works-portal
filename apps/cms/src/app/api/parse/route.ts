import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { parseProject } from '@works/parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {path, code?} → 调 parser 预览，返回 {draft}。不入库。 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  let body: { path?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体非法 JSON' }, { status: 400 });
  }
  if (!body.path || typeof body.path !== 'string') {
    return NextResponse.json({ error: 'path 必填' }, { status: 400 });
  }

  try {
    const draft = await parseProject(body.path, body.code);
    return NextResponse.json({
      draft,
      summary: {
        code: draft.project.code,
        display_name: draft.project.display_name,
        current_version: draft.project.current_version,
        features: draft.features.length,
        highlights: draft.highlights.length,
        releases: draft.releases.length,
        warnings: draft.warnings,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
