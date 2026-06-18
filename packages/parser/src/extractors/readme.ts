import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { firstH1, firstParagraph, findH2Section, collectListItemsUnderSection, listItems, extractVersion } from '../markdown';

export interface ReadmeOut {
  display_name?: string;
  tagline?: string;
  features: { title: string; summary?: string }[];
  tech_stack: string[];
  version_hint?: string;
}

const FEATURE_RE = /(功能|特点|Features|核心功能|功能特点|功能列表|主要功能)/i;
const TECH_RE = /(技术栈|Tech|技术架构|Technologies|^技术$)/i;

/** 读 README（找 README.md 或 README_*.md），返回展示信息。 */
export function extractReadme(root: string): ReadmeOut {
  const out: ReadmeOut = { features: [], tech_stack: [] };
  const candidates = ['README.md', 'README.zh.md', 'README.zh-CN.md', 'readme.md'];
  let md: string | null = null;
  for (const c of candidates) {
    const p = join(root, c);
    if (existsSync(p)) {
      md = readFileSync(p, 'utf8');
      break;
    }
  }
  if (md === null) {
    // glob README_*.md
    try {
      const entries = readdirSyncLite(root);
      const m = entries.find((n) => /^readme/i.test(n));
      if (m) md = readFileSync(join(root, m), 'utf8');
    } catch {
      // ignore
    }
  }
  if (md === null) return out;

  const h1 = firstH1(md);
  if (h1) out.display_name = h1;

  // tagline: 第一段（在 H1 之后）
  const afterH1 = md.replace(/^#[^\n]*\n/, '');
  out.tagline = firstParagraph(afterH1) ?? undefined;

  // version hint: 顶部 "当前版本[：:]\s*v?x.y.z" 或带日期
  const vm = /当前版本\s*[:：]\s*v?(\d+\.\d+\.\d+)/.exec(md);
  if (vm) out.version_hint = vm[1];
  else {
    const head = md.slice(0, 800);
    const v = extractVersion(head);
    if (v) out.version_hint = v;
  }

  // features: 找 ##/### 功能 / 特点 / Features 章节，递归收集子标题下的 list items
  const featItems = collectListItemsUnderSection(md, FEATURE_RE);
  if (featItems.length) {
    out.features = featItems.map((title) => ({ title }));
  } else {
    const featBody = findH2Section(md, FEATURE_RE);
    if (featBody) {
      out.features = listItems(featBody).map((title) => ({ title }));
    }
  }

  // tech_stack: 找 ##/### 技术栈 / Tech 块。每行如 "前端框架：微信小程序原生"
  // 抽冒号后的实际值；若没有冒号则保留整行。
  const techBody = findH2Section(md, TECH_RE);
  if (techBody) {
    const items = listItems(techBody);
    out.tech_stack = items
      .map((it) => {
        const m = /^[^：:]+[：:]\s*(.+)$/.exec(it);
        return (m ? m[1] : it).replace(/\*\*/g, '').trim();
      })
      .filter(Boolean);
  }

  return out;
}

import { readdirSync } from 'node:fs';
function readdirSyncLite(dir: string): string[] {
  return readdirSync(dir);
}
