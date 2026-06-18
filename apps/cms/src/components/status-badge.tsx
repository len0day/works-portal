import type { PublishStatus } from '@works/shared';

const STYLES: Record<PublishStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-emerald-500/15 text-emerald-700',
  archived: 'bg-amber-500/15 text-amber-700',
};

const LABELS: Record<PublishStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}

export const STATUS_OPTIONS: PublishStatus[] = ['draft', 'published', 'archived'];
export const FORM_OPTIONS = [
  { value: 'wechat_mp', label: '公众号' },
  { value: 'fullstack', label: '全栈应用' },
  { value: 'website', label: '网站' },
  { value: 'other', label: '其他' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'performance', label: '性能' },
  { value: 'architecture', label: '架构' },
  { value: 'i18n', label: '国际化' },
  { value: 'ai', label: 'AI' },
  { value: 'feature', label: '功能' },
  { value: 'fix', label: '修复' },
] as const;

export const CATEGORY_VALUES = [
  'performance',
  'architecture',
  'i18n',
  'ai',
  'feature',
  'fix',
] as const;
