import { walkFiles } from '../fs-walker';
import { extractReadme } from '../extractors/readme';
import { extractChangelog } from '../extractors/changelog';
import { extractProjConfig } from '../extractors/projconfig';
import { extractGitHistory } from '../extractors/git-tags';
import { extractDocIndex } from '../extractors/doc-index';
import { readFileSync } from 'node:fs';
import { firstH1 } from '../markdown';
import type { ProjectAdapter } from './types';

/**
 * 亲子任务星球: 微信小程序，package.json version 1.4.9 可信；
 * 中文版本更新文件按 (\d+\.\d+\.\d+)版本.*\.md 抽。
 */
export const mamaPraiseMe: ProjectAdapter = {
  id: 'mama-praise-me',
  code: 'mama-praise-me',
  slug: 'mama-praise-me',
  display_name: '亲子任务星球',
  form: 'wechat_mp',
  parse(ctx) {
    const { root, warnings, raw_meta } = ctx;
    const files = walkFiles(root);

    const readme = extractReadme(root);
    const changelog = extractChangelog(files);
    const projConfig = extractProjConfig(files);
    const git = extractGitHistory(root);
    const docIndex = extractDocIndex(files);
    raw_meta.projconfig = projConfig;

    // 没有 README，用 project.config.json 的 description + 固定 tagline
    const project = {
      code: 'mama-praise-me',
      display_name: '亲子任务星球',
      tagline: projConfig.description ?? '亲子任务探险小程序，让孩子在游戏中养成好习惯',
      form: 'wechat_mp' as const,
      description: projConfig.description,
      tech_stack: ['微信小程序原生', '微信云开发'],
      current_version: '1.4.9',
      source_path: root,
      raw_meta: { projConfig },
    };

    void readme;

    // highlights: doc-index（FIX_/PERFORMANCE_ 等）
    const highlights = docIndex.map((d, i) => ({
      title: d.title,
      body: d.body ?? null,
      category: d.category,
      sort_order: i,
      status: 'draft' as const,
    }));

    // features: 从 PROJECT_SUMMARY.md 的 list items 兜底（限制数量、过滤掉过短/过长的非功能描述）
    const featuresOut: { title: string; summary: string | null; sort_order: number; status: 'draft' }[] = [];
    try {
      const summaryFile = files.find((f) => /PROJECT_SUMMARY/i.test(f.name));
      if (summaryFile) {
        const md = readFileSync(summaryFile.path, 'utf8');
        const listRe = /^\s*[-*+]\s+(.+)$/gm;
        let m: RegExpExecArray | null;
        const seen = new Set<string>();
        while ((m = listRe.exec(md)) !== null && featuresOut.length < 20) {
          const t = m[1].replace(/\*\*/g, '').trim();
          // 只要 4-40 字、且看起来像功能名（非纯标点/非句子）
          if (t && t.length >= 4 && t.length <= 40 && !/[。，；！？]/.test(t) && !seen.has(t)) {
            seen.add(t);
            featuresOut.push({ title: t, summary: null, sort_order: featuresOut.length, status: 'draft' });
          }
        }
      }
    } catch (e) {
      warnings.push(`PROJECT_SUMMARY features 抽取失败: ${(e as Error).message}`);
    }

    // releases: changelog（中文版本文件）
    const releases = changelog.map((c, i) => ({
      version: c.version ?? `release-${i}`,
      title: c.title ?? null,
      date: c.date ?? null,
      body: c.body,
      source_file: c.source_file,
      is_major: c.is_major ?? false,
      sort_order: i,
      status: 'draft' as const,
    }));

    // git log 兜底（亲子星球可能有 commit 历史）
    if (releases.length === 0 && git.length > 0) {
      git.slice(0, 20).forEach((g, i) => {
        releases.push({
          version: g.version ?? `dev-${g.date ?? i}`,
          title: g.title ?? null,
          date: g.date ?? null,
          body: g.body,
          source_file: 'git-log',
          is_major: false,
          sort_order: i,
          status: 'draft' as const,
        });
      });
    }

    void firstH1;

    return { project, features: featuresOut, highlights, releases };
  },
};
