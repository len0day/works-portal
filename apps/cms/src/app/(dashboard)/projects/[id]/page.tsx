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

type Tab = 'basic' | 'features' | 'highlights' | 'releases';

export default function ProjectEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id; // 'new' = 新建
  const router = useRouter();
  const isNew = id === 'new';

  const [tab, setTab] = useState<Tab>('basic');
  const [project, setProject] = useState<PortalProject | null>(null);
  const [features, setFeatures] = useState<PortalFeature[]>([]);
  const [highlights, setHighlights] = useState<PortalHighlight[]>([]);
  const [releases, setReleases] = useState<PortalRelease[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        project: PortalProject;
        features: PortalFeature[];
        highlights: PortalHighlight[];
        releases: PortalRelease[];
      }>(`/api/projects/${id}`);
      setProject(data.project);
      setFeatures(data.features);
      setHighlights(data.highlights);
      setReleases(data.releases);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'basic', label: '基本信息' },
    { key: 'features', label: `功能点 (${features.length})` },
    { key: 'highlights', label: `技术亮点 (${highlights.length})` },
    { key: 'releases', label: `版本日志 (${releases.length})` },
  ];

  if (loading) return <div className="p-8 text-sm text-muted-foreground">加载中…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;

  return (
    <div>
      <header className="mb-6">
        <div className="mb-1 text-xs">
          <Link href="/projects" className="text-muted-foreground hover:underline">← 返回项目列表</Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? '新建项目' : (project?.display_name ?? '项目详情')}
        </h1>
      </header>

      <nav className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={isNew && t.key !== 'basic'}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
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
    </div>
  );
}
