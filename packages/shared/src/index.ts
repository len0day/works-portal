// 三方（portal / cms / parser）共用的类型契约

export type ProjectForm = 'wechat_mp' | 'fullstack' | 'website' | 'other';
export type PublishStatus = 'draft' | 'published' | 'archived';
export type Platform = 'xiaohongshu' | 'wechat_mp' | 'douyin';
export type HighlightCategory = 'performance' | 'architecture' | 'i18n' | 'ai' | 'feature' | 'fix';
export type AdminRole = 'admin' | 'editor';
export type MediaType = 'image' | 'video';

export interface PortalProject {
  id: string;
  slug: string;
  code: string;
  display_name: string;
  display_name_en?: string | null;
  tagline?: string | null;
  form: ProjectForm;
  description?: string | null;
  description_en?: string | null;
  icon_url?: string | null;
  cover_url?: string | null;
  repo_url?: string | null;
  homepage_url?: string | null;
  tech_stack?: string[] | null;
  status: PublishStatus;
  sort_order: number;
  current_version?: string | null;
  released_at?: string | null;
  source_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalFeature {
  id?: string;
  project_id?: string;
  title: string;
  summary?: string | null;
  detail?: string | null;
  icon?: string | null;
  sort_order: number;
  status: PublishStatus;
}

export interface PortalHighlight {
  id?: string;
  project_id?: string;
  title: string;
  metric_label?: string | null;
  metric_value?: string | null;
  body?: string | null;
  category: HighlightCategory;
  sort_order: number;
  status: PublishStatus;
}

export interface PortalRelease {
  id?: string;
  project_id?: string;
  version: string;
  title?: string | null;
  date?: string | null;
  body: string;
  source_file?: string | null;
  is_major?: boolean;
  status: PublishStatus;
  sort_order?: number;
}

export interface PortalMedia {
  id?: string;
  project_id?: string;
  type: MediaType;
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  sort_order: number;
  status: PublishStatus;
}

/** 解析器统一输出，CMS `/api/parse` 据此做幂等 upsert */
export interface PortalDraft {
  project: {
    code: string;
    display_name?: string;
    tagline?: string;
    form: ProjectForm;
    description?: string;
    tech_stack?: string[];
    current_version?: string;
    source_path?: string;
    repo_url?: string;
    homepage_url?: string;
    raw_meta?: Record<string, unknown>;
  };
  features: PortalFeature[];
  highlights: PortalHighlight[];
  releases: PortalRelease[];
  raw_meta: Record<string, unknown>;
  warnings: string[];
}

/** 分发文案生成参数 */
export interface DistributeInput {
  project: Pick<PortalProject, 'display_name' | 'tagline' | 'current_version'>;
  release?: Pick<PortalRelease, 'version' | 'title' | 'body'> | null;
  highlights: PortalHighlight[];
  platform: Platform;
  tone?: 'tech' | 'grass' | 'story';
  enhance?: boolean;
}

export interface DistributeOutput {
  title: string;
  body: string;
  tags: string[];
  deeplink?: string;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  xiaohongshu: '小红书',
  wechat_mp: '微信公众号',
  douyin: '抖音',
};

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};
