/**
 * 把 CMS 来的 markdown（description / release.body）渲染成 HTML。
 * 内容来自自有 CMS，使用 marked 默认转义即可。
 */
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(input?: string | null): string {
  if (!input || !input.trim()) return '';
  return marked.parse(input) as string;
}

/** 简化的日期格式化，兼容 ISO 字符串与空值。 */
export function formatDate(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
