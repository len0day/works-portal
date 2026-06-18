'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PortalMedia } from '@works/shared';
import { api } from '@/components/api';

type MediaForm = {
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string;
  caption: string;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
};

const EMPTY: MediaForm = {
  type: 'image',
  url: '',
  thumbnail_url: '',
  caption: '',
  sort_order: 0,
  status: 'draft',
};

function MediaRow({
  item,
  onUpdated,
  onDeleted,
}: {
  item: PortalMedia;
  onUpdated: (m: PortalMedia) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MediaForm>({
    type: item.type,
    url: item.url,
    thumbnail_url: item.thumbnail_url ?? '',
    caption: item.caption ?? '',
    sort_order: item.sort_order,
    status: item.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ media: PortalMedia }>(`/api/media/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          thumbnail_url: form.thumbnail_url || null,
          caption: form.caption || null,
        }),
      });
      onUpdated(data.media);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item.id || !confirm('确认删除这个媒体资源？')) return;
    try {
      await api(`/api/media/${item.id}`, { method: 'DELETE' });
      onDeleted(item.id);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Preview */}
      {item.url && !editing && (
        <div className="mb-3 aspect-video w-full max-w-xs overflow-hidden rounded bg-muted">
          {item.type === 'video' ? (
            <video src={item.url} className="h-full w-full object-cover" muted />
          ) : (
            <img src={item.url} alt={item.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
      )}

      {!editing ? (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                item.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {item.type}
              </span>
              {item.caption && (
                <p className="mt-1 text-sm font-medium">{item.caption}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{item.url}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                排序 {item.sort_order} &middot; {item.status}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="rounded border px-2 py-1 text-xs hover:bg-accent"
              >
                编辑
              </button>
              <button
                onClick={remove}
                className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">类型</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'image' | 'video' }))}
                className="w-full rounded border bg-background px-3 py-1.5 text-sm"
              >
                <option value="image">图片</option>
                <option value="video">视频</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">状态</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MediaForm['status'] }))}
                className="w-full rounded border bg-background px-3 py-1.5 text-sm"
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">URL</span>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              className="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono"
              placeholder="https://…"
            />
          </label>
          {form.type === 'video' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">封面图 URL (thumbnail)</span>
              <input
                value={form.thumbnail_url}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                className="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono"
              />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">说明文字 (caption)</span>
              <input
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                className="w-full rounded border bg-background px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">排序</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full rounded border bg-background px-3 py-1.5 text-sm"
                min={0}
              />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !form.url}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={() => setEditing(false)} className="rounded border px-3 py-1.5 text-sm hover:bg-accent">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMediaForm({
  projectId,
  onAdded,
  nextOrder,
}: {
  projectId: string;
  onAdded: (m: PortalMedia) => void;
  nextOrder: number;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MediaForm>({ ...EMPTY, sort_order: nextOrder });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ media: PortalMedia }>('/api/media', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          ...form,
          thumbnail_url: form.thumbnail_url || null,
          caption: form.caption || null,
        }),
      });
      onAdded(data.media);
      setForm({ ...EMPTY, sort_order: nextOrder + 1 });
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
      >
        + 添加媒体资源
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="font-medium text-sm">新建媒体</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">类型</span>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'image' | 'video' }))}
            className="w-full rounded border bg-background px-3 py-1.5 text-sm"
          >
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">排序</span>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            className="w-full rounded border bg-background px-3 py-1.5 text-sm"
            min={0}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">URL</span>
        <input
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          className="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono"
          placeholder="https://…"
        />
      </label>
      {form.type === 'video' && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">封面图 URL</span>
          <input
            value={form.thumbnail_url}
            onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
            className="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono"
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">说明 (caption)</span>
        <input
          value={form.caption}
          onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
          className="w-full rounded border bg-background px-3 py-1.5 text-sm"
        />
      </label>
      {form.url && form.type === 'image' && (
        <img src={form.url} alt="" className="h-24 w-full rounded object-cover bg-muted" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !form.url}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? '创建中…' : '创建'}
        </button>
        <button onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm hover:bg-accent">取消</button>
      </div>
    </div>
  );
}

export function MediaTab({ projectId, onChanged }: { projectId: string; onChanged: () => void }) {
  const [items, setItems] = useState<PortalMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ media: PortalMedia[] }>(`/api/media?project_id=${projectId}`);
      setItems(data.media);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">加载中…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">展示顺序小的媒体排在前面。图片和视频都支持。</p>
        <span className="text-xs text-muted-foreground">{items.length} 项</span>
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          还没有媒体资源，点击下方按鈕添加。
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <MediaRow
            key={item.id}
            item={item}
            onUpdated={(updated) => {
              setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              onChanged();
            }}
            onDeleted={(id) => {
              setItems((prev) => prev.filter((x) => x.id !== id));
              onChanged();
            }}
          />
        ))}
      </div>

      <AddMediaForm
        projectId={projectId}
        nextOrder={items.length}
        onAdded={(m) => {
          setItems((prev) => [...prev, m]);
          onChanged();
        }}
      />
    </div>
  );
}
