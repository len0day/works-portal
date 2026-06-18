import { readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'build',
  'out',
  'coverage',
  '.cache',
  '__pycache__',
  '.turbo',
]);

const INTERESTING_EXT = new Set(['.md', '.markdown']);
const INTERESTING_FILES = new Set(['package.json', 'project.config.json', 'pyproject.toml', 'version-config.js']);

export interface FoundFile {
  path: string; // absolute
  rel: string;  // relative to root
  name: string; // basename
  ext: string;
}

export interface WalkOptions {
  maxDepth?: number; // default 3
}

/** 递归扫目录，跳过常见构建产物，只收集有意义的文件。 */
export function walkFiles(root: string, opts: WalkOptions = {}): FoundFile[] {
  const maxDepth = opts.maxDepth ?? 4;
  const out: FoundFile[] = [];
  const seen = new Set<string>();

  const visit = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith('.') && name !== '.md') {
        // allow dotfiles we care about? skip hidden by default except nothing critical
      }
      if (IGNORE_DIRS.has(name)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (seen.has(full)) continue;
      seen.add(full);
      if (st.isDirectory()) {
        visit(full, depth + 1);
      } else if (st.isFile()) {
        const ext = extname(name).toLowerCase();
        const isInteresting =
          INTERESTING_EXT.has(ext) ||
          INTERESTING_FILES.has(name) ||
          /RELEASE_NOTES/i.test(name) ||
          /版本.*更新/i.test(name) ||
          /^(FEATURE|BUGFIX|PERFORMANCE|OPTIM|FIX)_.+\.md$/i.test(name) ||
          /^CHANGELOG/i.test(name) ||
          /^README/i.test(name);
        if (isInteresting) {
          out.push({ path: full, rel: full.slice(root.length).replace(/^[/\\]/, ''), name, ext });
        }
      }
    }
  };

  visit(root, 0);
  return out;
}

export function findByName(files: FoundFile[], name: string): FoundFile | undefined {
  return files.find((f) => f.name === name);
}

export function findByRegex(files: FoundFile[], re: RegExp): FoundFile[] {
  return files.filter((f) => re.test(f.name));
}
