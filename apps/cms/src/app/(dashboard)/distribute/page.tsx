'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Platform, PortalProject, PortalRelease, PublishStatus } from '@works/shared';
import { PLATFORM_LABELS } from '@works/shared';
import { api, formatDate } from '@/components/api';
import { StatusBadge } from '@/components/status-badge';
import { PLATFORM_BODY_LIMIT, PLATFORM_TITLE_LIMIT } from '@/lib/distribute/templates';
import QRCode from 'qrcode';

type Draft = {
  id: string;
  project_id: string;
  release_id: string | null;
  platform: Platform;
  title: string | null;
  body: string;
  tags: string[] | null;
  deeplink: string | null;
  status: PublishStatus;
  published_at: string | null;
  generation_meta: unknown;
  created_at: string;
  updated_at: string;
};

function charCount(s: string): number {
  return Array.from(s).length;
}

function copy(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('clipboard 不可用'));
}

const PLATFORMS: Platform[] = ['xiaohongshu', 'wechat_mp', 'douyin'];
const TONES = [
  { value: 'tech', label: '技术' },
  { value: 'grass', label: '种草' },
  { value: 'story', label: '故事' },
] as const;

export default function DistributePage() {
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [releases, setReleases] = useState<PortalRelease[]>([]);
  const [releaseId, setReleaseId] = useState('');
  const [platform, setPlatform] = useState<Platform>('xiaohongshu');
  const [tone, setTone] = useState<'tech' | 'grass' | 'story'>('tech');
  const [enhance, setEnhance] = useState(false);

  const [current, setCurrent] = useState<Draft | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const d = await api<{ projects: PortalProject[] }>('/api/projects');
      setProjects(d.projects);
      if (d.projects.length > 0 && !projectId) setProjectId(d.projects[0].id);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [projectId]);

  const loadReleases = useCallback(async () => {
    if (!projectId) return setReleases([]);
    try {
      const d = await api<{ releases: PortalRelease[] }>(
        `/api/releases?project_id=${encodeURIComponent(projectId)}`,
      );
      setReleases(d.releases);
    } catch {
      setReleases([]);
    }
  }, [projectId]);

  const loadDrafts = useCallback(async () => {
    if (!projectId) return setDrafts([]);
    try {
      const d = await api<{ drafts: Draft[] }>(
        `/api/distribute/drafts?project_id=${encodeURIComponent(projectId)}`,
      );
      setDrafts(d.drafts);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadReleases();
    setReleaseId('');
    loadDrafts();
  }, [loadReleases, loadDrafts]);

  // 生成 deeplink 的二维码
  useEffect(() => {
    const link = current?.deeplink ?? '';
    if (!link) {
      setQrUrl('');
      return;
    }
    QRCode.toDataURL(link, { margin: 1, width: 200 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [current?.deeplink]);

  async function handleGenerate() {
    if (!projectId) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const d = await api<{ draft: Draft; warning?: string }>('/api/distribute/generate', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          release_id: releaseId || undefined,
          platform,
          tone,
          enhance,
        }),
      });
      setCurrent(d.draft);
      setTitleDraft(d.draft.title ?? '');
      setBodyDraft(d.draft.body);
      setTagsDraft(d.draft.tags ?? []);
      if (d.warning) setWarning(d.warning);
      flashToast('文案已生成');
      loadDrafts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadDraftIntoEditor(d: Draft) {
    setCurrent(d);
    setTitleDraft(d.title ?? '');
    setBodyDraft(d.body);
    setTagsDraft(d.tags ?? []);
    setPlatform(d.platform);
    setWarning(null);
  }

  async function saveDraft() {
    if (!current) return;
    try {
      const d = await api<{ draft: Draft }>(`/api/distribute/drafts/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: titleDraft, body: bodyDraft, tags: tagsDraft }),
      });
      setCurrent(d.draft);
      flashToast('已保存');
      loadDrafts();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markPublished(published: boolean) {
    if (!current) return;
    try {
      const d = await api<{ draft: Draft }>(`/api/distribute/drafts/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: published ? 'published' : 'draft' }),
      });
      setCurrent(d.draft);
      flashToast(published ? '已标记为已发布' : '已撤销发布');
      loadDrafts();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm('确认删除该草稿？')) return;
    try {
      await api(`/api/distribute/drafts/${id}`, { method: 'DELETE' });
      if (current?.id === id) {
        setCurrent(null);
        setTitleDraft('');
        setBodyDraft('');
        setTagsDraft([]);
      }
      flashToast('已删除');
      loadDrafts();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copy(text);
      flashToast(`${label}已复制到剪贴板`);
    } catch {
      flashToast('复制失败，请手动选中复制');
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    setTagsDraft((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  }

  function removeTag(t: string) {
    setTagsDraft((prev) => prev.filter((x) => x !== t));
  }

  const titleCount = charCount(titleDraft);
  const bodyCount = charCount(bodyDraft);
  const bodyLimit = PLATFORM_BODY_LIMIT[platform];
  const titleLimit = PLATFORM_TITLE_LIMIT[platform];

  const fullText = useMemo(() => {
    return [titleDraft, bodyDraft, tagsDraft.join(' ')].filter(Boolean).join('\n\n');
  }, [titleDraft, bodyDraft, tagsDraft]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">多平台分发</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          生成各平台格式文案 → 复制到剪贴板 / 扫码唤起 App → 人工确认发布。不调用平台官方 API，不做自动发布。
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {toast && (
        <div className="mb-4 rounded-md border bg-emerald-500/10 p-3 text-sm text-emerald-700">{toast}</div>
      )}
      {warning && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">{warning}</div>
      )}

      {/* 顶部表单 */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">项目 *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">— 选择项目 —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">版本（可选）</label>
            <select
              value={releaseId}
              onChange={(e) => setReleaseId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">— 不指定版本 —</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>v{r.version}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">语气</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as 'tech' | 'grass' | 'story')}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">LLM 润色（可选）</label>
            <label className="flex h-[34px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
              />
              <span className="text-xs text-muted-foreground">启用 gpt-4o-mini（需 OPENAI_API_KEY）</span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs text-muted-foreground">平台</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                  platform === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={!projectId || busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? '生成中…' : '生成文案'}
          </button>
        </div>
      </div>

      {/* 编辑区 */}
      {current && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              编辑文案 · {PLATFORM_LABELS[current.platform]}
              {current.status === 'published' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  已发布 · {formatDate(current.published_at)}
                </span>
              )}
            </h2>
            <button onClick={saveDraft} className="rounded-md border px-3 py-1 text-xs hover:bg-accent">
              保存修改
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-muted-foreground">标题</label>
                <span className={`text-xs ${titleCount > titleLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {titleCount} / {titleLimit}
                </span>
              </div>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-muted-foreground">正文</label>
                <span className={`text-xs ${bodyCount > bodyLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {bodyCount} / {bodyLimit}
                  {bodyCount > bodyLimit && ' （超出限制）'}
                </span>
              </div>
              <textarea
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={10}
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">标签 / 话题</label>
              <div className="mb-2 flex flex-wrap gap-1">
                {tagsDraft.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {t}
                    <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="输入标签后回车添加"
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                />
                <button onClick={addTag} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">添加</button>
              </div>
            </div>

            {/* 操作区 */}
            <div className="border-t pt-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">复制</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCopy(fullText, '全文')}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                >
                  复制全文
                </button>
                <button
                  onClick={() => handleCopy(titleDraft, '标题')}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  复制标题
                </button>
                <button
                  onClick={() => handleCopy(bodyDraft, '正文')}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  复制正文
                </button>
                <button
                  onClick={() => handleCopy(tagsDraft.join(' '), '标签')}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  复制标签
                </button>
              </div>

              {/* 唤起区 */}
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">手机端发布</div>
                {platform === 'wechat_mp' ? (
                  <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                    微信公众号无外部唤起协议：请点「复制正文」→ 打开微信公众号后台（mp.weixin.qq.com）粘贴，markdown 结构可手动调整为图文。
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {qrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrUrl} alt="deeplink QR" className="h-[140px] w-[140px] rounded-md border" />
                    ) : (
                      <div className="h-[140px] w-[140px] rounded-md border border-dashed" />
                    )}
                    <div className="text-xs text-muted-foreground">
                      <p>用手机相机或微信扫码，唤起 {PLATFORM_LABELS[platform]} App；</p>
                      <p className="mt-1">App 打开后，长按输入框「粘贴」已复制的内容并发布。</p>
                      <p className="mt-2 break-all font-mono">deeplink: <code>{current.deeplink}</code></p>
                    </div>
                  </div>
                )}
              </div>

              {/* 发布标记 */}
              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                {current.status === 'published' ? (
                  <>
                    <span className="text-xs text-emerald-700">已标记为已发布（{formatDate(current.published_at)}）</span>
                    <button
                      onClick={() => markPublished(false)}
                      className="rounded-md border px-3 py-1 text-xs hover:bg-accent"
                    >
                      撤销发布
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => markPublished(true)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white"
                  >
                    我已发布
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 草稿列表 */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 text-sm font-semibold">
          分发草稿历史 {projectId ? `· ${projects.find((p) => p.id === projectId)?.display_name ?? ''}` : ''}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">平台</th>
              <th className="px-3 py-2">标题</th>
              <th className="px-3 py-2">版本</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">生成</th>
              <th className="px-3 py-2">创建</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">暂无草稿</td></tr>
            )}
            {drafts.map((d) => {
              const meta = (d.generation_meta ?? {}) as { llm?: string };
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="px-3 py-2">{PLATFORM_LABELS[d.platform]}</td>
                  <td className="px-3 py-2 max-w-[280px] truncate">{d.title ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {releases.find((r) => r.id === d.release_id)?.version ?? '—'}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={d.status as PublishStatus} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{meta.llm === 'none' ? '模板' : 'LLM'}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(d.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => loadDraftIntoEditor(d)} className="mr-2 text-xs text-primary hover:underline">编辑</button>
                    <button onClick={() => deleteDraft(d.id)} className="text-xs text-destructive hover:underline">删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
