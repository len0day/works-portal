// 多平台分发文案模板：纯函数，输入素材 -> 输出 {title, body, tags, deeplink}
// 平台：xiaohongshu / wechat_mp / douyin
// 合规：只生成文案，不调平台 API、不存账号密码。

import type { DistributeInput, DistributeOutput, Platform } from '@works/shared';

/** 按字符长度计字数（中文 1 字 = 1）。 */
export function countChars(s: string): number {
  return Array.from(s).length;
}

/** 截断到 max 字符（按 code point，避免切坏 emoji）。 */
function truncate(s: string, max: number): string {
  const arr = Array.from(s);
  return arr.length > max ? arr.slice(0, max).join('') : s;
}

type Tone = NonNullable<DistributeInput['tone']>;

const TONE_LABEL: Record<Tone, string> = {
  tech: '技术',
  grass: '种草',
  story: '故事',
};

const TONE_HOOK: Record<Tone, string> = {
  tech: '开发者向',
  grass: '亲测好用',
  story: '我的故事',
};

interface Material {
  name: string;
  tagline: string;
  version: string | null;
  highlights: Array<{
    title: string;
    metric_label?: string | null;
    metric_value?: string | null;
    body?: string | null;
  }>;
  release?: {
    version: string;
    title?: string | null;
    body: string;
  } | null;
  tone: Tone;
}

function pickMaterial(ctx: DistributeInput): Material {
  return {
    name: ctx.project.display_name || '我的作品',
    tagline: ctx.project.tagline || '',
    version: ctx.project.current_version ?? null,
    highlights: ctx.highlights.map((h) => ({
      title: h.title,
      metric_label: h.metric_label ?? null,
      metric_value: h.metric_value ?? null,
      body: h.body ?? null,
    })),
    release: ctx.release
      ? {
          version: ctx.release.version,
          title: ctx.release.title ?? null,
          body: ctx.release.body,
        }
      : null,
    tone: ctx.tone ?? 'tech',
  };
}

/** 取前 N 条带 metric 的卖点；不足则回落到 title。 */
function pickSellingPoints(m: Material, n: number): string[] {
  const withMetric = m.highlights.filter((h) => h.metric_value && h.metric_label);
  const points: string[] = [];
  for (const h of withMetric) {
    points.push(`${h.metric_label} ${h.metric_value}：${h.title}`);
    if (points.length >= n) break;
  }
  if (points.length < n) {
    for (const h of m.highlights) {
      if (points.length >= n) break;
      points.push(h.title);
    }
  }
  return points.slice(0, n);
}

/** 从 release body 抽前 N 条更新点（粗略按 markdown 列表/段落切）。 */
function pickReleaseNotes(m: Material, n: number): string[] {
  if (!m.release) return [];
  const lines = m.release.body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    // 去掉 markdown 标题与过短噪音
    .filter((l) => !/^#{1,6}\s/.test(l) && l.length >= 4);
  return lines.slice(0, n).map((l) => l.replace(/^[-*•]\s*/, ''));
}

// ============ 小红书 ============

function buildXiaohongshu(m: Material): DistributeOutput {
  const points = pickSellingPoints(m, 4);
  const name = m.name;

  // 标题：≤20 字，emoji + 痛点钩子
  const hookByTone: Record<Tone, string> = {
    tech: `独立开发${name}`,
    grass: `好物分享${name}`,
    story: `我做了一个${name}`,
  };
  const rawTitle = `${m.version ? `v${m.version} ` : ''}${hookByTone[m.tone]}`;
  const title = truncate(rawTitle, 20);

  // 正文：分段、每段首 emoji、≤800 字
  const lines: string[] = [];
  lines.push(`✨ ${m.tagline || '一款值得分享的小工具'}`);
  lines.push('');
  if (m.tone === 'story') {
    lines.push(`📖 为什么要做 ${name}？`);
    lines.push('一直想找个顺手的小工具，市面上的都不太满意，干脆自己做了一个。');
    lines.push('');
  }
  lines.push(`🔥 ${name} 的几个亮点`);
  for (const p of points) {
    lines.push(`✅ ${p}`);
  }
  lines.push('');
  if (m.release) {
    const notes = pickReleaseNotes(m, 3);
    if (notes.length > 0) {
      lines.push(`🚀 v${m.release.version} 更新`);
      for (const n of notes) lines.push(`· ${n}`);
      lines.push('');
    }
  }
  lines.push(`💡 ${TONE_HOOK[m.tone]} · 欢迎留言交流`);
  lines.push('你最常用哪个功能？评论区告诉我 👇');

  const body = lines.join('\n');

  // 3-5 个 #话题#
  const tags = [
    '#微信小程序#',
    '#独立开发#',
    '#作品分享#',
    `#${name}#`,
    '#效率工具#',
  ].slice(0, 5);

  return { title, body, tags, deeplink: 'xhsdiscover://' };
}

// ============ 微信公众号 ============

function buildWechat(m: Material): DistributeOutput {
  const points = pickSellingPoints(m, 5);
  const name = m.name;

  // 标题：≤30 字，正式
  const title = truncate(
    `${m.version ? `【${name} v${m.version}】` : `【${name}】`}${
      m.release?.title || m.tagline || '版本更新与产品介绍'
    }`,
    30,
  );

  // markdown 五段
  const lines: string[] = [];
  lines.push(`## 引言`);
  lines.push('');
  lines.push(
    `${m.tagline || ''}。本文介绍 **${name}**${m.version ? ` v${m.version}` : ''} 的核心亮点${
      m.release ? '与本次版本更新' : ''
    }。`,
  );
  lines.push('');
  lines.push(`> 封面建议尺寸 2.35:1（如 900×383）。`);
  lines.push('');
  lines.push(`## 核心亮点`);
  lines.push('');
  for (const p of points) {
    lines.push(`- ${p}`);
  }
  lines.push('');
  lines.push(`## 技术细节`);
  lines.push('');
  const techHighlights = m.highlights.filter((h) => h.body).slice(0, 2);
  if (techHighlights.length > 0) {
    for (const h of techHighlights) {
      lines.push(`**${h.title}**：${truncate(h.body || '', 120)}`);
      lines.push('');
    }
  } else {
    lines.push(`${name} 采用现代前后端技术栈，注重性能与可维护性。`);
    lines.push('');
  }
  if (m.release) {
    lines.push(`## 版本更新 (v${m.release.version})`);
    lines.push('');
    if (m.release.title) lines.push(`${m.release.title}`);
    lines.push('');
    const notes = pickReleaseNotes(m, 6);
    for (const n of notes) lines.push(`- ${n}`);
    lines.push('');
  }
  lines.push(`## 关注引导`);
  lines.push('');
  lines.push(`欢迎关注本号，获取更多独立开发作品与版本动态。`);

  const body = lines.join('\n');
  const tags = [`${name}`, '独立开发', '版本更新', '产品介绍'];

  return { title, body, tags, deeplink: '' };
}

// ============ 抖音 ============

function buildDouyin(m: Material): DistributeOutput {
  const points = pickSellingPoints(m, 2);
  const name = m.name;

  // 标题：极短带 #
  const title = truncate(`${name}${m.version ? ` v${m.version}` : ''}`, 20);

  // 文案：≤100 字口播稿，五段每段一行
  const lines: string[] = [];
  lines.push(`🔥 你见过${name}吗？`); // 钩子
  const pain =
    m.tone === 'story'
      ? '一个人做产品太难？'
      : '工具不好用？'; // 痛点
  lines.push(pain);
  // 方案：tagline 截短到 30 字以内
  const tagline = truncate((m.tagline || '它就是答案').replace(/，。.*$/, ''), 28);
  lines.push(`💡${tagline}`); // 方案
  // 成果：卖点只取 metric/title 前半，截短到 20 字
  const topRaw = points[0] || '轻量好用';
  const top = truncate(topRaw.replace(/[：:].*$/, ''), 18);
  lines.push(`✅${top}`);
  lines.push('👉主页链接，立刻体验'); // CTA

  // 保险：整体超 100 字则按 code point 截断
  let body = lines.join('\n');
  if (Array.from(body).length > 100) {
    body = truncate(body, 100);
  }
  const tags = [`#${name}`, '#独立开发', '#效率工具', '#好物推荐'];

  return { title, body, tags, deeplink: 'snssdk1128://' };
}

// ============ 调度 ============

const BUILDERS: Record<Platform, (m: Material) => DistributeOutput> = {
  xiaohongshu: buildXiaohongshu,
  wechat_mp: buildWechat,
  douyin: buildDouyin,
};

/** 主入口：根据平台选模板生成文案（纯函数，无副作用）。 */
export function buildDistributeOutput(ctx: DistributeInput): DistributeOutput {
  const m = pickMaterial(ctx);
  const builder = BUILDERS[ctx.platform];
  return builder(m);
}

/** 各平台字数上限（用于 UI 红色提示）。 */
export const PLATFORM_BODY_LIMIT: Record<Platform, number> = {
  xiaohongshu: 800,
  wechat_mp: 10000,
  douyin: 100,
};

export const PLATFORM_TITLE_LIMIT: Record<Platform, number> = {
  xiaohongshu: 20,
  wechat_mp: 30,
  douyin: 20,
};

export { TONE_LABEL };
