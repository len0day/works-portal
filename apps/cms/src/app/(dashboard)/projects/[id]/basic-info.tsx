'use client';

import { useState } from 'react';
import type { PortalProject, ProjectForm, PublishStatus } from '@works/shared';
import { api } from '@/components/api';
import { FORM_OPTIONS, STATUS_OPTIONS, StatusBadge } from '@/components/status-badge';
import { MarkdownEditor } from '@/components/md-editor';

interface Props {
  project: PortalProject | null;
  isNew: boolean;
  onSaved: (p: PortalProject | null, action: 'updated' | 'created') => void;
}

interface FormState {
  display_name: string;
  display_name_en: string;
  tagline: string;
  form: ProjectForm;
  slug: string;
  code: string;
  description: string;
  description_en: string;
  icon_url: string;
  cover_url: string;
  repo_url: string;
  homepage_url: string;
  tech_stack: string;
  sort_order: number;
  current_version: string;
  status: PublishStatus;
}

function init(p: PortalProject | null): FormState {
  return {
    display_name: p?.display_name ?? '',
    display_name_en: p?.display_name_en ?? '',
    tagline: p?.tagline ?? '',
    form: (p?.form ?? 'other') as ProjectForm,
    slug: p?.slug ?? '',
    code: p?.code ?? '',
    description: p?.description ?? '',
    description_en: p?.description_en ?? '',
    icon_url: p?.icon_url ?? '',
    cover_url: p?.cover_url ?? '',
    repo_url: p?.repo_url ?? '',
    homepage_url: p?.homepage_url ?? '',
    tech_stack: (p?.tech_stack ?? []).join(', '),
    sort_order: p?.sort_order ?? 0,
    current_version: p?.current_version ?? '',
    status: (p?.status ?? 'draft') as PublishStatus,
  };
}

export function BasicInfoTab({ project, isNew, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(init(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    return {
      display_name: form.display_name.trim(),
      display_name_en: form.display_name_en.trim() || null,
      tagline: form.tagline.trim() || null,
      form: form.form,
      slug: form.slug.trim(),
      code: form.code.trim(),
      description: form.description || null,
      description_en: form.description_en || null,
      icon_url: form.icon_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      repo_url: form.repo_url.trim() || null,
      homepage_url: form.homepage_url.trim() || null,
      tech_stack: form.tech_stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      sort_order: Number(form.sort_order) || 0,
      current_version: form.current_version.trim() || null,
      status: form.status,
    };
  }

  async function save() {
    if (!form.display_name.trim() || !form.slug.trim() || !form.code.trim()) {
      setError('display_name / slug / code 必填');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (isNew) {
        const data = await api<{ project: PortalProject }>('/api/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onSaved(data.project, 'created');
      } else if (project) {
        const data = await api<{ project: PortalProject }>(`/api/projects/${project.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        onSaved(data.project, 'updated');
        setSavedAt(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const label = 'mb-1 block text-xs font-medium text-muted-foreground';
  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

  return (
    <div className="max-w-3xl space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="展示名 *"><input className={inputCls} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} /></Field>
        <Field label="英文名"><input className={inputCls} value={form.display_name_en} onChange={(e) => set('display_name_en', e.target.value)} /></Field>
        <Field label="一句话简介 (tagline)"><input className={inputCls} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="形态">
          <select className={inputCls} value={form.form} onChange={(e) => set('form', e.target.value as ProjectForm)}>
            {FORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="slug * (URL 友好)"><input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="wechat-video-downloader" /></Field>
        <Field label="code * (仓库代号)"><input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="WeChatVideoDownloader" /></Field>
        <Field label="当前版本"><input className={inputCls} value={form.current_version} onChange={(e) => set('current_version', e.target.value)} /></Field>
        <Field label="排序权重"><input type="number" className={inputCls} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></Field>
        <Field label="状态">
          <div className="flex items-center gap-2">
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as PublishStatus)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <StatusBadge status={form.status} />
          </div>
        </Field>
      </div>

      <Field label="技术栈 (逗号分隔)"><input className={inputCls} value={form.tech_stack} onChange={(e) => set('tech_stack', e.target.value)} placeholder="Next.js, React, PostgreSQL" /></Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="图标 URL"><input className={inputCls} value={form.icon_url} onChange={(e) => set('icon_url', e.target.value)} /></Field>
        <Field label="封面 URL"><input className={inputCls} value={form.cover_url} onChange={(e) => set('cover_url', e.target.value)} /></Field>
        <Field label="仓库 URL"><input className={inputCls} value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} /></Field>
        <Field label="主页 URL"><input className={inputCls} value={form.homepage_url} onChange={(e) => set('homepage_url', e.target.value)} /></Field>
      </div>

      <Field label="描述 (markdown)">
        <MarkdownEditor value={form.description} onChange={(v) => set('description', v)} />
      </Field>
      <Field label="英文描述 (markdown)">
        <MarkdownEditor value={form.description_en} onChange={(v) => set('description_en', v)} height={160} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? '保存中…' : isNew ? '创建项目' : '保存修改'}
        </button>
        {savedAt && <span className="text-xs text-muted-foreground">已于 {savedAt} 保存</span>}
      </div>
    </div>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label className="block">
        <span className={label}>{label}</span>
        {children}
      </label>
    );
  }
}
