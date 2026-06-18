import { walkFiles } from '../fs-walker';
import { extractReadme } from '../extractors/readme';
import { extractChangelog } from '../extractors/changelog';
import { extractProjConfig } from '../extractors/projconfig';
import { extractGitHistory } from '../extractors/git-tags';
import { extractDocIndex } from '../extractors/doc-index';
import { extractVersionConfig } from '../extractors/version-config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { firstH1, firstParagraph } from '../markdown';
import type { ProjectAdapter } from './types';

/**
 * 云视仓: 微信小程序，无 CHANGELOG.md，用 RELEASE_NOTES_*.md；
 * current_version 以 config/version-config.js 首项或 README 顶部 4.0.0 为准。
 */
export const wechatVideoDownloader: ProjectAdapter = {
  id: 'WeChatVideoDownloader',
  code: 'WeChatVideoDownloader',
  slug: 'wechat-video-downloader',
  display_name: '云视仓',
  form: 'wechat_mp',
  parse(ctx) {
    const { root, warnings, raw_meta } = ctx;
    const files = walkFiles(root);

    const readme = extractReadme(root);
    const changelog = extractChangelog(files);
    const projConfig = extractProjConfig(files);
    const git = extractGitHistory(root);
    const docIndex = extractDocIndex(files);
    const versionConfig = extractVersionConfig(root);
    raw_meta.version_config = versionConfig;

    // current_version: version-config 首项 > readme 顶部 > 4.0.0 兜底
    const current_version =
      versionConfig[0]?.version ?? readme.version_hint ?? '4.0.0';

    const project = {
      code: 'WeChatVideoDownloader',
      display_name: readme.display_name ?? '云视仓',
      tagline: readme.tagline ?? '一款支持抖音、小红书内容下载的微信小程序',
      form: 'wechat_mp' as const,
      description: readme.tagline,
      tech_stack: readme.tech_stack.length
        ? readme.tech_stack
        : ['微信小程序原生', '微信云开发', 'i18n'],
      current_version,
      source_path: root,
      repo_url: undefined,
      homepage_url: undefined,
      raw_meta: { projConfig },
    };

    const features = readme.features.map((f, i) => ({
      title: f.title,
      summary: f.summary ?? null,
      sort_order: i,
      status: 'draft' as const,
    }));

    // highlights: doc-index（云视仓重点抽 PERFORMANCE/FEATURE）
    const highlights = docIndex.map((d, i) => ({
      title: d.title,
      body: d.body ?? null,
      metric_label: d.category === 'performance' ? '性能' : null,
      category: d.category,
      sort_order: i,
      status: 'draft' as const,
    }));

    // releases: changelog 优先（RELEASE_NOTES_*.md），其次 version-config
    const releases =
      changelog.length > 0
        ? changelog.map((c, i) => ({
            version: c.version ?? `release-${i}`,
            title: c.title ?? null,
            date: c.date ?? null,
            body: c.body,
            source_file: c.source_file,
            is_major: c.is_major ?? false,
            sort_order: i,
            status: 'draft' as const,
          }))
        : versionConfig.map((v, i) => ({
            version: v.version,
            title: v.title ?? null,
            date: v.date ?? null,
            body: v.features?.length ? v.features.map((f) => `- ${f}`).join('\n') : v.title ?? v.version,
            source_file: 'config/version-config.js',
            is_major: v.isMajor ?? false,
            sort_order: i,
            status: 'draft' as const,
          }));

    // 1.1.0版本更新介绍.md 这类中文文件作为额外 release 补充
    try {
      const extra = files.find((f) => /\d+\.\d+\.\d+版本/i.test(f.name));
      if (extra) {
        const md = readFileSync(extra.path, 'utf8');
        const vm = /(\d+\.\d+\.\d+)/.exec(extra.name)?.[1];
        const h1 = firstH1(md) ?? undefined;
        const body = md.replace(/^#[^\n]*\n+/, '').trim();
        if (vm && !releases.some((r) => r.version === vm)) {
          releases.push({
            version: vm,
            title: h1 ?? null,
            date: null,
            body: body || h1 || vm,
            source_file: extra.rel,
            is_major: false,
            sort_order: releases.length,
            status: 'draft' as const,
          });
        }
      }
    } catch (e) {
      warnings.push(`补充中文版本文件失败: ${(e as Error).message}`);
    }

    void git;
    void firstParagraph;
    void existsSync;
    void join;

    return { project, features, highlights, releases };
  },
};
