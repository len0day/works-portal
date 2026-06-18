'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  PortalProject,
  PortalFeature,
  PortalHighlight,
  PortalRelease,
} from '@works/shared';
import { api } from '@/components/api';
import { BasicInfoTab } from './basic-info';
import { FeaturesTab } from './features-tab';
import { HighlightsTab } from './highlights-tab';
import { ReleasesTab } from './releases-tab';
import { MediaTab } from './media-tab';

type Tab = 'basic' | 'features' | 'highlights' | 'releases' | 'media';

export default function ProjectEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const isNew = id === 'new';

  const [tab, setTab] = useState<Tab>('basic');
  const [project, setProject] = useState<PortalProject | null>(null);
  const [features, setFeatures] = useState<PortalFeature[]>([]);
  const [highlights, setHighlights] = useState<PortalHighlight[]>([]);
  const [releases, setReleases] = useState<PortalRelease[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const [projectData, mediaData] = await Promise.all([
        api<{
          project: PortalProject;
          features: PortalFeature[];
          highlights: PortalHighlight[];
          releases: PortalRelease[];
        }>(`/api/projects/${id}`),
        api<{ media: { length: number }[] }>(`/api/media?project_id=${id}`).catch(() => ({ media: [] })),
      ]);
      setProject(projectData.project);
      setFeatures(projectData.features);
      setHighlights(projectData.highlights);
      setReleases(projectData.releases);
      setMediaCount(mediaData.media.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  const tabs: Array<{ key: Tab; label: string; disabled?: boolean }> = [
    { key: 'basic',      label: '基本信息' },
    { key: 'features',   label: `功能点 (${features.length})`,    disabled: isNew },
    { key: 'highlights', label: `技术亮点 (${highlights.length})`, disabled: isNew },
    { key: 'releases',   label: `版本日志 (${releases.length})`,  disabled: isNew },
    { key: 'media',      label: `媒体展示 (${mediaCount})`,      disabled: isNew },
  ];

  if (loading) return <div className="p-8 text-sm text-muted-foreground">加载中…</div>;
  if (error)   return <div className="p-8 text-sm text-destructive">{error}</div>;

  return (
    <div>
      <header className="mb-6">
        <div className="mb-1 text-xs">
          <Link href="/projects" className="text-muted-foreground hover:underline">← 返回项目列表</Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? '新建项目' : (project?.display_name ?? '项目详情')}
        </h1>
        {project?.code && (
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">{project.code}</p>
        )}
      </header>

      <nav className="mb-6 flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={t.disabled}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'basic' && (
        <BasicInfoTab
          project={project}
          isNew={isNew}
          onSaved={(p, action) => {
            if (action === 'created' && p) router.push(`/projects/${p.id}`);
            else if (p) setProject(p);
          }}
        />
      )}
      {tab === 'features' && project && (
        <FeaturesTab projectId={project.id} features={features} onChanged={load} />
      )}
      {tab === 'highlights' && project && (
        <HighlightsTab projectId={project.id} highlights={highlights} onChanged={load} />
      )}
      {tab === 'releases' && project && (
        <ReleasesTab projectId={project.id} releases={releases} onChanged={load} />
      )}
      {tab === 'media' && project && (
        <MediaTab
          projectId={project.id}
          onChanged={() => {
            api<{ media: unknown[] }>(`/api/media?project_id=${project.id}`)
              .then((d) => setMediaCount(d.media.length))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
