/** 轻量 markdown 工具：按行切块、抽 H1/H2、抽 list items。不依赖 AST 库。 */

export interface MdSection {
  level: number;       // 1 / 2 / 3 ...
  title: string;       // 去掉前导 # 和首尾空白
  rawTitle: string;    // 原始行
  body: string[];      // 该节正文行（不含标题行，直到下一同/高等级标题）
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

/** 按标题切块。返回顺序块（含顶层无标题段以 level=0 表示）。 */
export function splitSections(md: string): MdSection[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sections: MdSection[] = [];
  let cur: MdSection | null = null;
  let inFence = false;

  const pushCur = () => {
    if (cur) sections.push(cur);
  };

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      if (cur) cur.body.push(line);
      continue;
    }
    if (inFence) {
      if (cur) cur.body.push(line);
      continue;
    }
    const m = HEADING_RE.exec(line);
    if (m) {
      pushCur();
      cur = {
        level: m[1].length,
        title: m[2].trim(),
        rawTitle: line,
        body: [],
      };
    } else if (cur) {
      cur.body.push(line);
    } else {
      // 顶部无标题内容
      cur = { level: 0, title: '', rawTitle: '', body: [line] };
    }
  }
  pushCur();
  return sections;
}

/** 取第一个 H1 标题文本。 */
export function firstH1(md: string): string | null {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1})\s+(.*?)\s*$/.exec(line);
    if (m) return m[2].trim();
  }
  return null;
}

/** 找到第一个匹配的 H2/H3 段落（标题正则），返回其 body 文本（trim）。 */
export function findH2Section(md: string, titleRe: RegExp): string | null {
  const sections = splitSections(md);
  for (const s of sections) {
    if ((s.level === 2 || s.level === 3) && titleRe.test(s.title)) {
      return s.body.join('\n').trim();
    }
  }
  return null;
}

/**
 * 找到匹配的 H2 章节，并递归收集其下所有（含子标题内的）list items。
 * 用于 "## 功能特点" 下还有 "### 核心功能" 子标题的情况。
 */
export function collectListItemsUnderSection(md: string, titleRe: RegExp): string[] {
  const sections = splitSections(md);
  let targetIdx = -1;
  let targetLevel = 99;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    if ((s.level === 2 || s.level === 3) && titleRe.test(s.title)) {
      targetIdx = i;
      targetLevel = s.level;
      break;
    }
  }
  if (targetIdx === -1) return [];
  const items: string[] = [];
  for (let i = targetIdx; i < sections.length; i++) {
    const s = sections[i]!;
    // 遇到同级或更高级别的标题就停止（跳出该章节）
    if (i > targetIdx && s.level > 0 && s.level <= targetLevel) break;
    for (const line of s.body) {
      const m = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/.exec(line);
      if (m) {
        const item = stripInline(m[1]).trim();
        if (item) items.push(item);
      }
    }
  }
  return items;
}

/** 在给定文本里抽 list items（- / * / + / 数字. 开头），返回去重后的 trim 文本数组。 */
export function listItems(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const m = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/.exec(raw);
    if (m) {
      const item = stripInline(m[1]).trim();
      if (item && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

/** 取正文第一段非空非标题文本（到第一个空行或下一标题）。 */
export function firstParagraph(md: string): string | null {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  const buf: string[] = [];
  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (HEADING_RE.test(line)) {
      if (buf.length) break;
      continue;
    }
    if (line.trim() === '') {
      if (buf.length) break;
      continue;
    }
    buf.push(line.trim());
  }
  if (!buf.length) return null;
  return stripInline(buf.join(' ')).trim();
}

/** 抠掉 markdown 行内格式（**bold**、`code`、[link](url)、图片），保留纯文本。 */
export function stripInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

/** 从文本中抽版本号（优先 semver）。 */
export function extractVersion(text: string): string | null {
  const m = /\b(v?\d+\.\d+\.\d+(?:[-+][\w.]+)?)\b/.exec(text);
  if (!m) return null;
  return m[1].replace(/^v/, '');
}

/** 从文本中抽 ISO 日期 YYYY-MM-DD。 */
export function extractDate(text: string): string | null {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(text);
  return m ? m[1] : null;
}
