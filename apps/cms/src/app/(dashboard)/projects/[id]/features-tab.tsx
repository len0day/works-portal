'use client';

import { useState } from 'react';
import type { PortalFeature, PublishStatus } from '@works/shared';
import { api } from '@/components/api';
import { STATUS_OPTIONS, StatusBadge } from '@/components/status-badge';
import { MarkdownEditor } from '@/components/md-editor';
import { Modal } from './modal';

interface Props {
  projectId: string;
  features: PortalFeature[];
  onChanged: () => void;
}

interface EditState {
  id?: string;
  title: string;
  summary: string;
  detail: string;
  icon: string;
  sort_order: number;
  status: PublishStatus;
}

const empty: EditState = { title: '', summary: '', detail: '', icon: '', sort_order: 0, status: 'draft' };

export function FeaturesTab({ projectId, features, onChanged }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!editing || !editing.title.trim()) {
      setError('title 必填');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: editing.title.trim(),
        summary: editing.summary || null,
        detail: editing.detail || null,
        icon: editing.icon || null,
        sort_order: Number(editing.sort_order) || 0,
        status: editing.status,
      };
      if (editing.id) {
        await api(`/api/features/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/features', { method: 'POST', body: JSON.stringify({ project_id: projectId, ...payload }) });
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
    if (!confirm('确认删除该功能点？')) return;
    try {
      await api(`/api/features/${id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function startEdit(f: PortalFeature) {
    setEditing({
      id: f.id,
      title: f.title,
      summary: f.summary ?? '',
      detail: f.detail ?? '',
      icon: f.icon ?? '',
      sort_order: f.sort_order,
      status: f.status,
    });
  }

  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">功能点</h2>
        <button onClick={() => setEditing({ ...empty })} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">+ 新增</button>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">标题</th>
              <th className="px-3 py-2">摘要</th>
              <th className="px-3 py-2">图标</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {features.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">暂无功能点</td></tr>
            )}
            {features.map((f, i) => (
              <tr key={f.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{f.icon ? `${f.icon} ` : ''}{f.title}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{f.summary ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{f.icon ?? '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={f.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(f)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">编辑</button>{' '}
                  <button onClick={() => remove(f.id!)} className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? '编辑功能点' : '新增功能点'} onClose={() => setEditing(null)}>
          {error && <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <div className="space-y-3">
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">标题 *</span>
              <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">摘要</span>
              <input className={inputCls} value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">图标 (emoji 或 lucide 名)</span>
              <input className={inputCls} value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">详情 (markdown)</span>
              <MarkdownEditor value={editing.detail} onChange={(v) => setEditing({ ...editing, detail: v })} height={180} /></label>
            <div className="grid grid-cols-2 gap-3">
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
