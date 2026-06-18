import type { PortalDraft, ProjectForm, PortalFeature, PortalHighlight, PortalRelease } from '@works/shared';

export interface AdapterContext {
  root: string;
  warnings: string[];
  raw_meta: Record<string, unknown>;
}

/** Adapter：组合 extractors + 项目专属规则，返回 PortalDraft 片段。 */
export interface ProjectAdapter {
  code: string;
  slug: string;
  display_name: string;
  form: ProjectForm;
  /** 标识，便于 normalizer 记录 */
  id: string;
  parse(ctx: AdapterContext): Omit<PortalDraft, 'raw_meta' | 'warnings'> & {
    features: PortalFeature[];
    highlights: PortalHighlight[];
    releases: PortalRelease[];
  };
}

export const ADAPTERS: Record<string, ProjectAdapter> = {};
export function registerAdapter(a: ProjectAdapter) {
  ADAPTERS[a.code] = a;
}

export function getAdapter(code: string): ProjectAdapter | undefined {
  return ADAPTERS[code];
}
