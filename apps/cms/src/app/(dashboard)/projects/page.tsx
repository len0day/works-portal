'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PortalDraft, PublishStatus, ProjectForm } from '@works/shared';
import { StatusBadge, FORM_OPTIONS } from '@/components/status-badge';
import { api, formatDate } from '@/components/api';

interface ProjectRow {
  id: string;
  slug: string;
  code: string;
  display_name: string;
  display_name_en?: string | null;
  tagline?: string | null;
  form: ProjectForm;
  icon_url?: string | null;
  cover_url?: string | null;
  current_version?: string | null;
  status: PublishStatus;
  sort_order: number;
  released_at?: string | null;
  updated_at: string;
  features_count: number;
  highlights_count: number;
  releases_count: number;
}

// ===== M2 导入区类型 =====
interface Summary {
  code: string;
  display_name?: string;
  current_version?: string;
  features: number;
  highlights: number;
  releases: number;
  warnings: string[];
}
interface CommitResult {
  project_id: string;
  code: string;
  action: 'inserted' | 'updated';
  features: { inserted: number; skipped: number };
  highlights: { inserted: number; skipped: number };
  releases: { inserted: number; skipped: number; protected_published: number };
}

const PRESETS = [
  { code: 'WeChatVideoDownloader', path: '/Users/len/WeChatVideoDownloader', label: '云视仓' },
  { code: 'mama-praise-me', path: '/Users/len/Projects/mama-praise-me', label: '亲子任务星球' },
  { code: 'AiForKids', path: '/Users/len/Projects/AiForKids', label: 'WonderLearn' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ projects: ProjectRow[] }>('/api/projects');
      setProjects(data.projects);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(p: ProjectRow) {
    const next: PublishStatus = p.status === 'published' ? 'draft' : 'published';
    try {
      await api(`/api/projects/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function remove(p: ProjectRow) {
    if (!confirm(`确认删除项目「${p.display_name}」？其下功能点/亮点/版本将一并删除。`)) return;
    try {
      await api(`/api/projects/${p.id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">项目管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">维护作品元数据、功能点、技术亮点与版本日志。</p>
        </div>
        <button
          onClick={() => router.push('/projects/new')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + 新建项目
        </button>
      </header>

      <ImportSection onChanged={load} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">展示名 / code</th>
              <th className="px-3 py-2">形态</th>
              <th className="px-3 py-2">当前版本</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2 text-center">功能</th>
              <th className="px-3 py-2 text-center">亮点</th>
              <th className="px-3 py-2 text-center">版本</th>
              <th className="px-3 py-2">更新</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">加载中…</td>
              </tr>
            )}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">暂无项目，可点击右上角新建或顶部导入。</td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2">
                  <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                    {p.display_name}
                  </Link>
                  {p.display_name_en && (
                    <div className="text-xs text-muted-foreground">{p.display_name_en}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{p.code}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {FORM_OPTIONS.find((f) => f.value === p.form)?.label ?? p.form}
                </td>
                <td className="px-3 py-2">{p.current_version ?? '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-3 py-2 text-center tabular-nums">{p.features_count}</td>
                <td className="px-3 py-2 text-center tabular-nums">{p.highlights_count}</td>
                <td className="px-3 py-2 text-center tabular-nums">{p.releases_count}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(p.updated_at)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`rounded-md border px-2 py-1 text-xs hover:bg-accent ${
                        p.status === 'published' ? 'text-emerald-700' : ''
                      }`}
                    >
                      {p.status === 'published' ? '撤回' : '发布'}
                    </button>
                    <Link
                      href={`/projects/${p.id}`}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => remove(p)}
                      className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== M2 导入区（折叠保留） =====
function ImportSection({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<PortalDraft | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function preview() {
    setLoading(true);
    setError(null);
    setDraft(null);
    setSummary(null);
    setCommitResult(null);
    try {
      const data = await api<{ draft: PortalDraft; summary: Summary }>(
        '/api/parse',
        { method: 'POST', body: JSON.stringify({ path, code: code || undefined }) },
      );
      setDraft(data.draft);
      setSummary(data.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ result: CommitResult }>('/api/parse/commit', {
        method: 'POST',
        body: JSON.stringify({ draft }),
      });
      setCommitResult(data.result);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="mb-6 rounded-lg border bg-card p-4" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-sm font-medium">📦 从本地仓库解析导入（M2 解析器）</summary>
      <div className="mt-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.code}
              onClick={() => { setPath(p.path); setCode(p.code); }}
              className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">仓库路径</span>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/len/WeChatVideoDownloader"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">code（adapter 标识）</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WeChatVideoDownloader"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={preview}
            disabled={loading || !path}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? '处理中…' : '预览解析'}
          </button>
          {draft && (
            <button
              onClick={commit}
              disabled={loading}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              入库（幂等）
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {summary && (
          <div className="mt-3 rounded-md border bg-background p-4 text-sm">
            <div className="font-semibold">{summary.display_name ?? summary.code} · {summary.code} · v{summary.current_version ?? '?'}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              功能 {summary.features} · 亮点 {summary.highlights} · 版本 {summary.releases}
            </div>
          </div>
        )}

        {commitResult && (
          <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="font-semibold">{commitResult.action === 'inserted' ? '新建' : '更新'}项目 {commitResult.code}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              功能 +{commitResult.features.inserted}/{commitResult.features.skipped} · 亮点 +{commitResult.highlights.inserted}/{commitResult.highlights.skipped} · 版本 +{commitResult.releases.inserted}/{commitResult.releases.skipped}/{commitResult.releases.protected_published}
            </div>
          </div>
        )}

        {draft && (
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">查看完整 Draft JSON</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(draft, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </details>
  );
}
