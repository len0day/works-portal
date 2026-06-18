import { count } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [[p], [f], [h], [r], [d]] = await Promise.all([
    db.select({ n: count() }).from(schema.portal_projects),
    db.select({ n: count() }).from(schema.portal_features),
    db.select({ n: count() }).from(schema.portal_highlights),
    db.select({ n: count() }).from(schema.portal_releases),
    db.select({ n: count() }).from(schema.portal_publish_drafts),
  ]);

  const stats = [
    { label: '项目', value: Number(p?.n ?? 0), hint: '已录入的作品' },
    { label: '功能点', value: Number(f?.n ?? 0), hint: '核心功能' },
    { label: '技术亮点', value: Number(h?.n ?? 0), hint: '可量化指标' },
    { label: '版本日志', value: Number(r?.n ?? 0), hint: 'release 条目' },
    { label: '分发草稿', value: Number(d?.n ?? 0), hint: '多平台文案' },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          作品门户内容管理后台。下一步：运行解析器导入首批三个项目（云视仓 / 亲子任务星球 / WonderLearn）。
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-5">
            <div className="text-3xl font-bold tabular-nums">{s.value}</div>
            <div className="mt-1 text-sm font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
