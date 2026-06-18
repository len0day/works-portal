'use client';

import { useState } from 'react';
import type { PortalHighlight, PublishStatus, HighlightCategory } from '@works/shared';
import { api } from '@/components/api';
import { CATEGORY_OPTIONS, STATUS_OPTIONS, StatusBadge } from '@/components/status-badge';
import { MarkdownEditor } from '@/components/md-editor';
import { Modal } from './modal';

interface Props {
  projectId: string;
  highlights: PortalHighlight[];
  onChanged: () => void;
}

interface EditState {
  id?: string;
  title: string;
  metric_label: string;
  metric_value: string;
  body: string;
  category: HighlightCategory;
  sort_order: number;
  status: PublishStatus;
}

const empty: EditState = { title: '', metric_label: '', metric_value: '', body: '', category: 'feature', sort_order: 0, status: 'draft' };

export function HighlightsTab({ projectId, highlights, onChanged }: Props) {
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
        metric_label: editing.metric_label || null,
        metric_value: editing.metric_value || null,
        body: editing.body || null,
        category: editing.category,
        sort_order: Number(editing.sort_order) || 0,
        status: editing.status,
      };
      if (editing.id) {
        await api(`/api/highlights/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/highlights', { method: 'POST', body: JSON.stringify({ project_id: projectId, ...payload }) });
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
    if (!confirm('确认删除该技术亮点？')) return;
    try {
      await api(`/api/highlights/${id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function startEdit(h: PortalHighlight) {
    setEditing({
      id: h.id,
      title: h.title,
      metric_label: h.metric_label ?? '',
      metric_value: h.metric_value ?? '',
      body: h.body ?? '',
      category: h.category,
      sort_order: h.sort_order,
      status: h.status,
    });
  }

  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">技术亮点</h2>
        <button onClick={() => setEditing({ ...empty })} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">+ 新增</button>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">标题</th>
              <th className="px-3 py-2">指标</th>
              <th className="px-3 py-2">分类</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {highlights.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">暂无技术亮点</td></tr>
            )}
            {highlights.map((h, i) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{h.title}</td>
                <td className="px-3 py-2 text-xs">
                  {h.metric_label && h.metric_value ? `${h.metric_label}: ${h.metric_value}` : '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {CATEGORY_OPTIONS.find((c) => c.value === h.category)?.label ?? h.category}
                </td>
                <td className="px-3 py-2"><StatusBadge status={h.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(h)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">编辑</button>{' '}
                  <button onClick={() => remove(h.id!)} className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? '编辑技术亮点' : '新增技术亮点'} onClose={() => setEditing(null)}>
          {error && <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <div className="space-y-3">
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">标题 *</span>
              <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">指标名 (如 内存占用)</span>
                <input className={inputCls} value={editing.metric_label} onChange={(e) => setEditing({ ...editing, metric_label: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">指标值 (如 ↓75%)</span>
                <input className={inputCls} value={editing.metric_value} onChange={(e) => setEditing({ ...editing, metric_value: e.target.value })} /></label>
            </div>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">分类</span>
              <select className={inputCls} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as HighlightCategory })}>
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">技术说明 (markdown)</span>
              <MarkdownEditor value={editing.body} onChange={(v) => setEditing({ ...editing, body: v })} height={180} /></label>
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
