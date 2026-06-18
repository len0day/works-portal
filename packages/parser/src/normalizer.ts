import type { PortalDraft, PortalFeature, PortalHighlight, PortalRelease } from '@works/shared';
import { walkFiles, type FoundFile } from './fs-walker';
import { extractPackageJson } from './extractors/package-json';
import { extractReadme } from './extractors/readme';
import { extractChangelog } from './extractors/changelog';
import { extractProjConfig } from './extractors/projconfig';
import { extractGitHistory } from './extractors/git-tags';
import { extractDocIndex } from './extractors/doc-index';
import { getAdapter, type AdapterContext } from './adapters/index';

export interface NormalizeOptions {
  code?: string;
}

/** 主入口：扫项目目录，应用 adapter（如有），合并所有 extractor 输出为 PortalDraft。 */
export async function parseProject(root: string, code?: string): Promise<PortalDraft> {
  const warnings: string[] = [];
  const raw_meta: Record<string, unknown> = {};

  let files: FoundFile[] = [];
  try {
    files = walkFiles(root);
  } catch (e) {
    warnings.push(`fs-walker 失败: ${(e as Error).message}`);
  }
  raw_meta.files = files.map((f) => f.rel);

  // 各 extractor（独立 try/catch）
  const safe = <T>(name: string, fn: () => T): T | undefined => {
    try {
      const v = fn();
      raw_meta[name] = v;
      return v;
    } catch (e) {
      warnings.push(`extractor ${name} 失败: ${(e as Error).message}`);
      raw_meta[name] = { error: (e as Error).message };
      return undefined;
    }
  };

  const pkg = safe('package_json', () => extractPackageJson(root, files));
  const readme = safe('readme', () => extractReadme(root));
  const changelog = safe('changelog', () => extractChangelog(files));
  const projConfig = safe('projconfig', () => extractProjConfig(files));
  const git = safe('git', () => extractGitHistory(root));
  const docIndex = safe('doc_index', () => extractDocIndex(files));

  // 找 adapter
  const adapterCode = code ?? pkg?.name;
  const adapter = adapterCode ? getAdapter(adapterCode) : undefined;
  if (adapterCode && !adapter) {
    warnings.push(`未找到 code=${adapterCode} 的 adapter，使用通用解析`);
  }

  const ctx: AdapterContext = { root, warnings, raw_meta };

  if (adapter) {
    const adapted = adapter.parse(ctx);
    return {
      project: { ...adapted.project, source_path: root },
      features: adapted.features,
      highlights: adapted.highlights,
      releases: adapted.releases,
      raw_meta,
      warnings,
    };
  }

  // 通用 fallback：合并各 extractor
  const project: PortalDraft['project'] = {
    code: code ?? pkg?.name ?? 'unknown',
    display_name: readme?.display_name ?? pkg?.name,
    tagline: readme?.tagline ?? pkg?.description ?? undefined,
    form: 'other',
    description: readme?.tagline ?? pkg?.description ?? undefined,
    tech_stack: readme?.tech_stack,
    current_version: readme?.version_hint ?? pkg?.version,
    source_path: root,
  };

  const features: PortalFeature[] = (readme?.features ?? []).map((f, i) => ({
    title: f.title,
    summary: f.summary ?? null,
    sort_order: i,
    status: 'draft' as const,
  }));

  const highlights: PortalHighlight[] = (docIndex ?? []).map((d, i) => ({
    title: d.title,
    body: d.body ?? null,
    category: d.category,
    sort_order: i,
    status: 'draft' as const,
  }));

  const releases: PortalRelease[] = [
    ...(changelog ?? []).map((c, i) => ({
      version: c.version ?? `release-${i}`,
      title: c.title ?? null,
      date: c.date ?? null,
      body: c.body,
      source_file: c.source_file,
      is_major: c.is_major ?? false,
      sort_order: i,
      status: 'draft' as const,
    })),
    ...(git ?? []).map((g, i) => ({
      version: g.version ?? `dev-${g.date ?? i}`,
      title: g.title ?? null,
      date: g.date ?? null,
      body: g.body,
      is_major: g.is_major ?? false,
      sort_order: 1000 + i,
      status: 'draft' as const,
    })),
  ];

  void projConfig; // 通用 fallback 不直接使用小程序字段

  return { project, features, highlights, releases, raw_meta, warnings };
}
