/**
 * portal 数据模型（与 fetch-cms.ts 拉取的 JSON 形状一致）。
 * 所有从 DB 来的可空字段都标注为可选，调用方需做 nullish 防御。
 */

export interface Project {
  id: string;
  slug: string;
  code: string;
  display_name: string;
  display_name_en?: string | null;
  tagline?: string | null;
  form?: string | null;
  description?: string | null;
  description_en?: string | null;
  icon_url?: string | null;
  cover_url?: string | null;
  repo_url?: string | null;
  homepage_url?: string | null;
  tech_stack?: string[] | null;
  status: string;
  sort_order: number;
  current_version?: string | null;
  released_at?: string | null;
}

export interface Feature {
  id: string;
  project_id: string;
  title: string;
  summary?: string | null;
  detail?: string | null;
  icon?: string | null;
  sort_order: number;
  status: string;
}

export interface Highlight {
  id: string;
  project_id: string;
  title: string;
  metric_label?: string | null;
  metric_value?: string | null;
  body?: string | null;
  category: string;
  sort_order: number;
  status: string;
}

export interface Release {
  id: string;
  project_id: string;
  version: string;
  title?: string | null;
  date?: string | null;
  body: string;
  source_file?: string | null;
  is_major?: boolean | null;
  sort_order: number;
  status: string;
}

export interface Media {
  id: string;
  project_id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  sort_order: number;
  status: string;
}
