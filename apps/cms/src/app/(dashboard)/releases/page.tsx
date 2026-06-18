'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { PortalProject, PortalRelease, PublishStatus } from '@works/shared';
import { api, formatDate } from '@/components/api';
import { StatusBadge } from '@/components/status-badge';

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Array<PortalRelease & { project_name?: string }>>([]);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api<{ projects: PortalProject[] }>('/api/projects');
      setProjects(data.projects);
    } catch {
      /* 忽略 */
    }
  }, []);

  const loadReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter ? `/api/releases?project_id=${encodeURIComponent(filter)}` : '/api/releases';
      const data = await api<{ releases: PortalRelease[] }>(url);
      // 附加 project 展示名
      const map = new Map(projects.map((p) => [p.id, p.display_name]));
      setReleases(data.releases.map((r) => ({ ...r, project_name: map.get(r.project_id ?? '') })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, projects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">版本日志</h1>
        <p className="mt-1 text-sm text-muted-foreground">跨项目的版本日志聚合视图，可按项目筛选。</p>
      </header>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-muted-foreground">项目筛选</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">全部 ({projects.length})</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">项目</th>
              <th className="px-3 py-2">版本</th>
              <th className="px-3 py-2">标题</th>
              <th className="px-3 py-2">日期</th>
              <th className="px-3 py-2">主要</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">加载中…</td></tr>}
            {!loading && releases.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">暂无版本日志</td></tr>
            )}
            {releases.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2">
                  {r.project_id ? (
                    <Link href={`/projects/${r.project_id}`} className="hover:underline">{r.project_name ?? '—'}</Link>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 font-medium">v{r.version}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.title ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{formatDate(r.date)}</td>
                <td className="px-3 py-2 text-xs">{r.is_major ? '★' : ''}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status as PublishStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
