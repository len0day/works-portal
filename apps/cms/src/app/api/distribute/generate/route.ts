import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { buildDistributeOutput } from '@/lib/distribute/templates';
import type { DistributeInput, Platform, PortalHighlight } from '@works/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORM_VALUES: Platform[] = ['xiaohongshu', 'wechat_mp', 'douyin'];

interface OpenAIMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 可选：调 gpt-4o-mini 做语气润色，不改结构、不超字数。失败回退模板输出。 */
async function enhanceWithLLM(
  platform: Platform,
  base: { title: string; body: string; tags: string[] },
  material: { name: string; tagline: string },
  tone: 'tech' | 'grass' | 'story',
  bodyLimit: number,
  titleLimit: number,
): Promise<{ out: typeof base; warning?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { out: base, warning: '未配置 OPENAI_API_KEY，已回退纯模板输出' };
  }
  const limitHint =
    platform === 'douyin'
      ? `标题≤${titleLimit}字，正文≤${bodyLimit}字（极简口播稿）。`
      : platform === 'xiaohongshu'
        ? `标题≤${titleLimit}字，正文≤${bodyLimit}字，每段首 emoji。`
        : `标题≤${titleLimit}字，正文用 markdown 结构。`;

  const sys: OpenAIMsg = {
    role: 'system',
    content:
      '你是中文社媒文案润色助手。只调整语气和表达，不改变事实、不增加卖点、不增加段落结构、不输出额外解释。严格在字数限制内。直接返回 JSON：{"title": string, "body": string}。',
  };
  const user: OpenAIMsg = {
    role: 'user',
    content: `作品：${material.name}（${material.tagline}）。语气：${tone}。${limitHint}\n请润色以下文案，保留 emoji 与分段：\n标题：${base.title}\n正文：${base.body}`,
  };

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        max_tokens: 800,
        messages: [sys, user],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { out: base, warning: `LLM 请求失败 (${res.status})，已回退模板` };
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return { out: base, warning: 'LLM 返回为空，已回退模板' };
    const parsed = JSON.parse(raw) as { title?: string; body?: string };
    const titleArr = Array.from(String(parsed.title ?? base.title));
    const title = titleArr.slice(0, titleLimit).join('') || base.title;
    const body = String(parsed.body ?? base.body);
    return { out: { title, body, tags: base.tags }, warning: undefined };
  } catch (e) {
    return { out: base, warning: `LLM 调用异常（${e instanceof Error ? e.message : 'unknown'}），已回退模板` };
  }
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
  const platformRaw = String(body.platform ?? '').trim();
  if (!projectId || !PLATFORM_VALUES.includes(platformRaw as Platform)) {
    return NextResponse.json({ error: 'project_id / platform(platform=xiaohongshu|wechat_mp|douyin) 必填' }, { status: 400 });
  }
  const platform = platformRaw as Platform;
  const tone: 'tech' | 'grass' | 'story' =
    body.tone === 'grass' || body.tone === 'story' ? body.tone : 'tech';
  const enhance = Boolean(body.enhance);
  const releaseId = body.release_id ? String(body.release_id) : null;

  // 取 project
  const [project] = await db
    .select()
    .from(schema.portal_projects)
    .where(eq(schema.portal_projects.id, projectId))
    .limit(1);
  if (!project) return NextResponse.json({ error: 'project 不存在' }, { status: 404 });

  // 可选 release
  let release: typeof schema.portal_releases.$inferSelect | null = null;
  if (releaseId) {
    const [r] = await db
      .select()
      .from(schema.portal_releases)
      .where(eq(schema.portal_releases.id, releaseId))
      .limit(1);
    release = r ?? null;
  }

  // highlights
  const highlights = (await db
    .select()
    .from(schema.portal_highlights)
    .where(eq(schema.portal_highlights.project_id, projectId))
    .orderBy(asc(schema.portal_highlights.sort_order), asc(schema.portal_highlights.created_at))) as PortalHighlight[];

  const ctx: DistributeInput = {
    project: {
      display_name: project.display_name,
      tagline: project.tagline ?? undefined,
      current_version: project.current_version ?? undefined,
    },
    release: release
      ? { version: release.version, title: release.title ?? undefined, body: release.body }
      : null,
    highlights,
    platform,
    tone,
    enhance,
  };

  const templateOut = buildDistributeOutput(ctx);
  let out = templateOut;
  let warning: string | undefined;
  if (enhance) {
    const r = await enhanceWithLLM(
      platform,
      templateOut,
      { name: project.display_name, tagline: project.tagline ?? '' },
      tone,
      platform === 'douyin' ? 100 : platform === 'xiaohongshu' ? 800 : 10000,
      platform === 'xiaohongshu' ? 20 : platform === 'wechat_mp' ? 30 : 20,
    );
    out = r.out;
    warning = r.warning;
  }

  const [created] = await db
    .insert(schema.portal_publish_drafts)
    .values({
      project_id: projectId,
      release_id: releaseId ?? null,
      platform,
      title: out.title,
      body: out.body,
      tags: out.tags,
      deeplink: out.deeplink ?? null,
      status: 'draft',
      generation_meta: {
        template: true,
        llm: enhance ? 'gpt-4o-mini' : 'none',
        tone,
        ...(warning ? { warning } : {}),
      },
    })
    .returning();

  return NextResponse.json({ draft: created, ...(warning ? { warning } : {}) }, { status: 201 });
}
