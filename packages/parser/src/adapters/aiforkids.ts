import { walkFiles } from '../fs-walker';
import { extractReadme } from '../extractors/readme';
import { extractGitHistory } from '../extractors/git-tags';
import { extractDocIndex } from '../extractors/doc-index';
import { extractPackageJson } from '../extractors/package-json';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectAdapter } from './types';

/**
 * WonderLearn (AiForKids): fullstack。根 package.json 0.0.1 是 figma 模板不可信；
 * current_version 用 backend/pyproject.toml 的 1.0.0；releases 从 git log 生成；
 * tech_stack 合并 backend pyproject + admin package.json。
 */
export const aiforkids: ProjectAdapter = {
  id: 'AiForKids',
  code: 'AiForKids',
  slug: 'wonderlearn',
  display_name: 'WonderLearn',
  form: 'fullstack',
  parse(ctx) {
    const { root, warnings, raw_meta } = ctx;
    const files = walkFiles(root);

    const readme = extractReadme(root);
    const git = extractGitHistory(root);
    const docIndex = extractDocIndex(files);

    // backend/pyproject.toml
    const py = files.find((f) => f.name === 'pyproject.toml');
    let backendVersion = '1.0.0';
    const tech: string[] = [];
    if (py) {
      try {
        const text = readFileSync(py.path, 'utf8');
        const vm = /^version\s*=\s*"([^"]+)"/m.exec(text);
        if (vm) backendVersion = vm[1];
        // 抽 dependencies 里的关键库
        const depMatch = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(text);
        if (depMatch) {
          const itemRe = /"([^">=< !]+)>=?/g;
          let im: RegExpExecArray | null;
          const keywords = ['fastapi', 'sqlalchemy', 'langchain', 'openai', 'anthropic', 'pgvector', 'redis', 'pydantic'];
          while ((im = itemRe.exec(depMatch[1])) !== null) {
            const lib = im[1].toLowerCase();
            if (keywords.some((k) => lib.includes(k))) {
              tech.push(lib);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // admin/student package.json
    for (const sub of ['AiForKids-admin', 'admin', 'student']) {
      const p = join(root, sub, 'package.json');
      if (existsSync(p)) {
        try {
          const data = JSON.parse(readFileSync(p, 'utf8'));
          if (data.dependencies) {
            for (const k of Object.keys(data.dependencies as Record<string, unknown>)) {
              if (/^(next|react|tailwindcss|typescript|drizzle-orm|mui|@mui)/.test(k)) {
                tech.push(k);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    raw_meta.backend_version = backendVersion;
    raw_meta.tech_stack = tech;

    const project = {
      code: 'AiForKids',
      display_name: readme.display_name ?? 'WonderLearn',
      tagline: readme.tagline ?? '儿童学习智能体 · AI Learning Assistant for Kids',
      form: 'fullstack' as const,
      description: readme.tagline,
      tech_stack: tech.length ? Array.from(new Set(tech)) : readme.tech_stack,
      current_version: backendVersion,
      source_path: root,
      raw_meta: { backendVersion },
    };

    // features: README 核心 list items
    const features = readme.features.map((f, i) => ({
      title: f.title,
      summary: f.summary ?? null,
      sort_order: i,
      status: 'draft' as const,
    }));

    const highlights = docIndex.map((d, i) => ({
      title: d.title,
      body: d.body ?? null,
      category: d.category,
      sort_order: i,
      status: 'draft' as const,
    }));

    // releases: 从 git log 生成（AiForKids 无 tag）
    const releases = git.slice(0, 20).map((g, i) => ({
      version: g.version ?? `dev-${g.date ?? i + 1}`,
      title: g.title ?? null,
      date: g.date ?? null,
      body: g.body,
      is_major: g.is_major ?? false,
      sort_order: i,
      status: 'draft' as const,
    }));

    void extractPackageJson;
    void warnings;

    return { project, features, highlights, releases };
  },
};
