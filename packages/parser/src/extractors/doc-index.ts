import { readFileSync } from 'node:fs';
import type { FoundFile } from '../fs-walker';
import { firstH1, firstParagraph } from '../markdown';
import type { HighlightCategory as Cat } from '@works/shared';

function classify(name: string): Cat | null {
  if (/^FEATURE_/i.test(name)) return 'feature';
  if (/^BUGFIX_|^FIX_/i.test(name)) return 'fix';
  if (/^PERFORMANCE_|^PERF_/i.test(name)) return 'performance';
  if (/^OPTIM/i.test(name)) return 'performance';
  if (/^ARCHITECTURE_/i.test(name)) return 'architecture';
  if (/^I18N_|^TRANSLATION_/i.test(name)) return 'i18n';
  if (/^AI_/i.test(name)) return 'ai';
  return null;
}

export interface DocHighlight {
  title: string;
  body?: string;
  category: Cat;
  source_file: string;
}

/** 扫所有 .md，按文件名前缀分类成 highlights。 */
export function extractDocIndex(files: FoundFile[]): DocHighlight[] {
  const out: DocHighlight[] = [];
  for (const f of files) {
    if (!/\.md$/i.test(f.name)) continue;
    const cat = classify(f.name);
    if (!cat) continue;
    let md = '';
    try {
      md = readFileSync(f.path, 'utf8');
    } catch {
      continue;
    }
    const title = firstH1(md) ?? f.name.replace(/\.md$/i, '').replace(/_/g, ' ');
    const body = firstParagraph(md.replace(/^#[^\n]*\n/, '')) ?? undefined;
    out.push({ title, body, category: cat, source_file: f.rel });
  }
  return out;
}
