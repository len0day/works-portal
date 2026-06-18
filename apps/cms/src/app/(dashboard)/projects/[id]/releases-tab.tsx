'use client';

import { useState } from 'react';
import type { PortalRelease, PublishStatus } from '@works/shared';
import { api, formatDate } from '@/components/api';
import { STATUS_OPTIONS, StatusBadge } from '@/components/status-badge';
import { MarkdownEditor } from '@/components/md-editor';
import { Modal } from './modal';

interface Props {
  projectId: string;
  releases: PortalRelease[];
  onChanged: () => void;
}

interface EditState {
  id?: string;
  version: string;
  title: string;
  date: string;
  body: string;
  is_major: boolean;
  sort_order: number;
  status: PublishStatus;
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

const empty: EditState = { version: '', title: '', date: '', body: '', is_major: false, sort_order: 0, status: 'draft' };

export function ReleasesTab({ projectId, releases, onChanged }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!editing || !editing.version.trim()) {
      setError('version 必填');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        version: editing.version.trim(),
        title: editing.title || null,
        date: editing.date || null,
        body: editing.body || '',
        is_major: editing.is_major,
        sort_order: Number(editing.sort_order) || 0,
        status: editing.status,
      };
      if (editing.id) {
        await api(`/api/releases/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/releases', { method: 'POST', body: JSON.stringify({ project_id: projectId, ...payload }) });
      }
      setEditing(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('确认删除该版本日志？')) return;
    try {
      await api(`/api/releases/${id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function startEdit(r: PortalRelease) {
    setEditing({
      id: r.id,
      version: r.version,
      title: r.title ?? '',
      date: toDateInput(r.date),
      body: r.body ?? '',
      is_major: Boolean(r.is_major),
      sort_order: r.sort_order ?? 0,
      status: r.status,
    });
  }

  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">版本日志</h2>
        <button onClick={() => setEditing({ ...empty })} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">+ 新增</button>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">版本</th>
              <th className="px-3 py-2">标题</th>
              <th className="px-3 py-2">日期</th>
              <th className="px-3 py-2">主要</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">暂无版本日志</td></tr>
            )}
            {releases.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2 font-medium">v{r.version}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.title ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{formatDate(r.date)}</td>
                <td className="px-3 py-2 text-xs">{r.is_major ? '★' : ''}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(r)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">编辑</button>{' '}
                  <button onClick={() => remove(r.id!)} className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? '编辑版本日志' : '新增版本日志'} onClose={() => setEditing(null)}>
          {error && <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">版本号 *</span>
                <input className={inputCls} value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} placeholder="4.0.0" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">日期</span>
                <input type="date" className={inputCls} value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
            </div>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">标题</span>
              <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">正文 (markdown)</span>
              <MarkdownEditor value={editing.body} onChange={(v) => setEditing({ ...editing, body: v })} height={220} /></label>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.is_major} onChange={(e) => setEditing({ ...editing, is_major: e.target.checked })} /> 主要版本</label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">排序</span>
                <input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">状态</span>
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PublishStatus })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">取消</button>
            <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
