import { execSync } from 'node:child_process';

export interface GitTagRelease {
  version?: string;
  title?: string;
  date?: string;
  body: string;
  is_major?: boolean;
}

function git(root: string, args: string): string {
  try {
    return execSync(`git -C ${JSON.stringify(root)} ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000,
    }).trim();
  } catch {
    return '';
  }
}

/**
 * 优先 `git tag --list --sort=-creatordate`，每 tag 抽日期+commit 标题。
 * 无 tag 时降级为 `git log --oneline -20` 倒序生成开发日志条目（is_major=false, version 留空）。
 */
export function extractGitHistory(root: string): GitTagRelease[] {
  const tagsRaw = git(root, 'tag --list --sort=-creatordate');
  const tags = tagsRaw ? tagsRaw.split('\n').map((t) => t.trim()).filter(Boolean) : [];
  if (tags.length) {
    const out: GitTagRelease[] = [];
    for (const tag of tags) {
      const line = git(root, `log ${JSON.stringify(tag)} -1 --format=%cI%x09%s`);
      if (!line) continue;
      const [dateIso, ...subj] = line.split('\t');
      const subject = subj.join('\t').trim();
      const version = /^v?(\d+\.\d+\.\d+)/.exec(tag)?.[1];
      out.push({
        version,
        title: subject || tag,
        date: dateIso ? dateIso.slice(0, 10) : undefined,
        body: subject || `Release ${tag}`,
        is_major: /major|大版本|重大/i.test(tag) || (/^\d+\.\d+\.0$/.test(version ?? '') && !/\.\d+$/.test(version ?? 'x')),
      });
    }
    return out;
  }

  // 降级：git log
  const logRaw = git(root, 'log --oneline -20 --format=%cI%x09%s');
  if (!logRaw) return [];
  const out: GitTagRelease[] = [];
  let idx = 0;
  for (const line of logRaw.split('\n')) {
    if (!line.trim()) continue;
    const [dateIso, ...subj] = line.split('\t');
    const subject = subj.join('\t').trim();
    if (!subject) continue;
    const date = dateIso ? dateIso.slice(0, 10) : undefined;
    // version 用日期+序号保证唯一，避免去重时合并不同 commit
    out.push({
      version: date ? `dev-${date}-${idx + 1}` : `dev-${idx + 1}`,
      title: subject,
      date,
      body: subject,
      is_major: false,
    });
    idx++;
  }
  return out;
}
