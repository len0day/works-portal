import { readFileSync } from 'node:fs';
import type { FoundFile } from '../fs-walker';

export interface PackageJsonOut {
  name?: string;
  version?: string;
  description?: string;
  keywords?: string[];
  source: 'package.json' | 'pyproject.toml' | 'none';
}

/** 读 package.json，找不到则退回 backend/pyproject.toml。 */
export function extractPackageJson(root: string, files: FoundFile[]): PackageJsonOut {
  const pkg = files.find((f) => f.name === 'package.json' && f.rel === 'package.json');
  if (pkg) {
    try {
      const data = JSON.parse(readFileSync(pkg.path, 'utf8'));
      return {
        name: typeof data.name === 'string' ? data.name : undefined,
        version: typeof data.version === 'string' ? data.version : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        keywords: Array.isArray(data.keywords) ? data.keywords.filter((k: unknown): k is string => typeof k === 'string') : undefined,
        source: 'package.json',
      };
    } catch {
      // fall through
    }
  }
  // pyproject.toml 退路
  const py = files.find((f) => f.name === 'pyproject.toml');
  if (py) {
    try {
      const text = readFileSync(py.path, 'utf8');
      const name = /^name\s*=\s*"([^"]+)"/m.exec(text)?.[1];
      const version = /^version\s*=\s*"([^"]+)"/m.exec(text)?.[1];
      const desc = /^description\s*=\s*"([^"]+)"/m.exec(text)?.[1];
      return { name, version, description: desc, source: 'pyproject.toml' };
    } catch {
      // ignore
    }
  }
  return { source: 'none' };
}
