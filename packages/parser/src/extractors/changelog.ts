import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { FoundFile } from '../fs-walker';
import { firstH1, extractDate, splitSections } from '../markdown';

export interface ChangelogRelease {
  version?: string;
  title?: string;
  date?: string;
  body: string;
  source_file: string;
  is_major?: boolean;
}

/** 优先 CHANGELOG.md 按 ## [x.y.z] 切块；否则扫 RELEASE_NOTES_*.md 和中文 *版本*更新*.md。 */
export function extractChangelog(files: FoundFile[]): ChangelogRelease[] {
  const changelog = files.find((f) => /^CHANGELOG/i.test(f.name));
  if (changelog) {
    try {
      return parseChangelogMd(readFileSync(changelog.path, 'utf8'), changelog.rel);
    } catch {
      // fall through
    }
  }
  // 云视仓风格: RELEASE_NOTES_x.y.z.md
  const releaseFiles = files
    .filter((f) => /RELEASE_NOTES_(\d+\.\d+\.\d+)/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  if (releaseFiles.length) {
    return releaseFiles.map((f) => parseSingleReleaseNote(readFileSync(f.path, 'utf8'), f.rel, f.name));
  }
  // 亲子星球风格: 中文 版本更新 文件
  const zhFiles = files
    .filter((f) => /(\d+\.\d+\.\d+)\s*版本/.test(f.name) || /版本.*更新/.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  if (zhFiles.length) {
    return zhFiles.map((f) => parseSingleReleaseNote(readFileSync(f.path, 'utf8'), f.rel, f.name));
  }
  return [];
}

function parseChangelogMd(md: string, rel: string): ChangelogRelease[] {
  const out: ChangelogRelease[] = [];
  const sections = splitSections(md);
  for (const s of sections) {
    if (s.level !== 2) continue;
    // ## [1.2.3] 或 ## 1.2.3 或 ## [1.2.3] - 2024-01-01
    const vm = /\[?(v?\d+\.\d+\.\d+(?:[-+][\w.]+)?)\]?/.exec(s.title);
    if (!vm) continue;
    const version = vm[1].replace(/^v/, '');
    const dm = extractDate(s.title) ?? extractDate(s.body.join('\n'));
    const title = s.title.replace(/\[|\]/g, '').trim();
    out.push({
      version,
      title,
      date: dm ?? undefined,
      body: s.body.join('\n').trim(),
      source_file: rel,
    });
  }
  return out;
}

function parseSingleReleaseNote(md: string, rel: string, name: string): ChangelogRelease {
  // 版本号从文件名抽
  const vm = /(\d+\.\d+\.\d+)/.exec(name);
  const version = vm ? vm[1] : undefined;
  // H1 抽 title
  const h1 = firstH1(md);
  // body = 去掉 H1 后的正文
  const body = md.replace(/^#[^\n]*\n+/, '').trim();
  // 日期
  const dm = /发布日期\s*[:：]\s*(\d{4}-\d{2}-\d{2})/.exec(md);
  const date = dm ? dm[1] : (extractDate(md) ?? undefined);
  // is_major: 文件名或 H1 含"重大/大版本/major"
  const is_major = /重大|大版本|major/i.test(name + (h1 ?? ''));
  return {
    version,
    title: h1 ?? undefined,
    date,
    body,
    source_file: rel,
    is_major,
  };
}
