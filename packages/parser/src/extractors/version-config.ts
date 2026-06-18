import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface VersionConfigEntry {
  version: string;
  date?: string;
  title?: string;
  isMajor?: boolean;
  features?: string[];
}

/**
 * 微信小程序云视仓风格：config/version-config.js 里有个 DEFAULT_VERSION_HISTORY 数组。
 * 用轻量正则抽每个对象的字段，不执行 JS。
 */
export function extractVersionConfig(root: string): VersionConfigEntry[] {
  const p = join(root, 'config', 'version-config.js');
  if (!existsSync(p)) return [];
  let text: string;
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    return [];
  }
  // 拿到 DEFAULT_VERSION_HISTORY 数组段
  const arrMatch = /DEFAULT_VERSION_HISTORY\s*=\s*\[([\s\S]*?)\];?\s*(?:const|$)/.exec(text);
  const body = arrMatch ? arrMatch[1] : text;
  // 按 `{ ... }` 切对象（不嵌套大括号即可，本配置无嵌套）
  const out: VersionConfigEntry[] = [];
  const objRe = /\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(body)) !== null) {
    const obj = m[1];
    const version = /version\s*:\s*['"]([^'"]+)['"]/.exec(obj)?.[1];
    if (!version) continue;
    const date = /date\s*:\s*['"]([^'"]+)['"]/.exec(obj)?.[1];
    const title = /title\s*:\s*['"]([^'"]+)['"]/.exec(obj)?.[1];
    const isMajor = /isMajor\s*:\s*(true|false)/.exec(obj)?.[1] === 'true';
    // features 数组
    const features: string[] = [];
    const featMatch = /features\s*:\s*\[([\s\S]*?)\]/.exec(obj);
    if (featMatch) {
      const itemRe = /['"]([^'"]+)['"]/g;
      let im: RegExpExecArray | null;
      while ((im = itemRe.exec(featMatch[1])) !== null) features.push(im[1]);
    }
    out.push({ version, date, title, isMajor, features });
  }
  return out;
}
