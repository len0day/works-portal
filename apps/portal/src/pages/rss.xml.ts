import type { APIRoute } from 'astro';
import projects from '../data/projects.json';
import releases from '../data/releases.json';
import type { Project, Release } from '../lib/types';

const projectList = projects as Project[];
const releaseList = releases as Release[];

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://portal.aiedutalk.online')).href.replace(/\/$/, '');
  const projectMap = new Map(projectList.map((p) => [p.id, p]));

  const items = releaseList
    .slice()
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    })
    .slice(0, 20)
    .map((r: Release) => {
      const p = projectMap.get(r.project_id);
      const slug = p?.slug ?? '';
      const pubDate = r.date ? new Date(r.date).toUTCString() : new Date().toUTCString();
      const url = `${base}/projects/${slug}/releases/${encodeURIComponent(r.version)}`;
      const title = `${p?.display_name ?? '项目'} ${r.version}${r.title ? ' · ' + r.title : ''}`;
      // RSS 需要 CDATA 包裹 HTML 正文
      const html = r.body
        ? r.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
        : '本版本无更新说明。';
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${html}]]></description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>作品门户 · 版本更新</title>
    <link>${escapeXml(base)}/</link>
    <description>最近发布的版本更新日志</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
