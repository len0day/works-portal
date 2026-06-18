import { eq, and } from 'drizzle-orm';
import type { PortalDraft } from '@works/shared';
import { db, schema, closeDb } from '@works/db';

export interface CommitResult {
  project_id: string;
  code: string;
  action: 'inserted' | 'updated';
  features: { inserted: number; skipped: number };
  highlights: { inserted: number; skipped: number };
  releases: { inserted: number; skipped: number; protected_published: number };
}

/**
 * 幂等 upsert PortalDraft。
 * - project: 按 code 找；无则 insert(status='draft')，有则更新非 published 字段（保留 status/已发布字段）。
 * - features/highlights: 按 (project_id, title) 去重。
 * - releases: 按 (project_id, version) 去重；status='published' 的跳过不覆盖。
 */
export async function commitDraft(draft: PortalDraft): Promise<CommitResult> {
  const { project, features, highlights, releases } = draft;

  // 1. project upsert by code
  const existing = await db
    .select()
    .from(schema.portal_projects)
    .where(eq(schema.portal_projects.code, project.code))
    .limit(1);
  let projectId: string;
  let action: 'inserted' | 'updated';

  if (existing.length === 0) {
    const [inserted] = await db
      .insert(schema.portal_projects)
      .values({
        slug: project.code.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        code: project.code,
        display_name: project.display_name ?? project.code,
        tagline: project.tagline ?? null,
        form: project.form,
        description: project.description ?? null,
        tech_stack: project.tech_stack ?? null,
        current_version: project.current_version ?? null,
        source_path: project.source_path ?? null,
        repo_url: project.repo_url ?? null,
        homepage_url: project.homepage_url ?? null,
        raw_meta: project.raw_meta ?? null,
        status: 'draft',
      })
      .returning({ id: schema.portal_projects.id });
    projectId = inserted!.id;
    action = 'inserted';
  } else {
    const row = existing[0]!;
    // 只更新非 published 字段；不触碰 status、icon_url/cover_url 等可能人工编辑的字段
    await db
      .update(schema.portal_projects)
      .set({
        display_name: project.display_name ?? row.display_name,
        tagline: project.tagline ?? row.tagline,
        description: project.description ?? row.description,
        tech_stack: project.tech_stack ?? row.tech_stack,
        current_version: project.current_version ?? row.current_version,
        source_path: project.source_path ?? row.source_path,
        raw_meta: project.raw_meta ?? row.raw_meta,
        updated_at: new Date(),
      })
      .where(eq(schema.portal_projects.id, row.id));
    projectId = row.id;
    action = 'updated';
  }

  // 2. features by (project_id, title)
  let featInserted = 0, featSkipped = 0;
  for (const f of features) {
    const exists = await db
      .select({ id: schema.portal_features.id })
      .from(schema.portal_features)
      .where(
        and(
          eq(schema.portal_features.project_id, projectId),
          eq(schema.portal_features.title, f.title),
        ),
      )
      .limit(1);
    if (exists.length) {
      featSkipped++;
      continue;
    }
    await db.insert(schema.portal_features).values({
      project_id: projectId,
      title: f.title,
      summary: f.summary ?? null,
      detail: f.detail ?? null,
      icon: f.icon ?? null,
      sort_order: f.sort_order,
      status: 'draft',
    });
    featInserted++;
  }

  // 3. highlights by (project_id, title)
  let hlInserted = 0, hlSkipped = 0;
  for (const h of highlights) {
    const exists = await db
      .select({ id: schema.portal_highlights.id })
      .from(schema.portal_highlights)
      .where(
        and(
          eq(schema.portal_highlights.project_id, projectId),
          eq(schema.portal_highlights.title, h.title),
        ),
      )
      .limit(1);
    if (exists.length) {
      hlSkipped++;
      continue;
    }
    await db.insert(schema.portal_highlights).values({
      project_id: projectId,
      title: h.title,
      metric_label: h.metric_label ?? null,
      metric_value: h.metric_value ?? null,
      body: h.body ?? null,
      category: h.category,
      sort_order: h.sort_order,
      status: 'draft',
    });
    hlInserted++;
  }

  // 4. releases by (project_id, version)；published 跳过
  let relInserted = 0, relSkipped = 0, relProtected = 0;
  for (const r of releases) {
    const exists = await db
      .select({ id: schema.portal_releases.id, status: schema.portal_releases.status })
      .from(schema.portal_releases)
      .where(
        and(
          eq(schema.portal_releases.project_id, projectId),
          eq(schema.portal_releases.version, r.version),
        ),
      )
      .limit(1);
    if (exists.length) {
      if (exists[0]!.status === 'published') {
        relProtected++;
      } else {
        relSkipped++;
      }
      continue;
    }
    await db.insert(schema.portal_releases).values({
      project_id: projectId,
      version: r.version,
      title: r.title ?? null,
      date: r.date ? new Date(r.date) : null,
      body: r.body,
      source_file: r.source_file ?? null,
      is_major: r.is_major ?? false,
      sort_order: r.sort_order ?? 0,
      status: 'draft',
    });
    relInserted++;
  }

  return {
    project_id: projectId,
    code: project.code,
    action,
    features: { inserted: featInserted, skipped: featSkipped },
    highlights: { inserted: hlInserted, skipped: hlSkipped },
    releases: { inserted: relInserted, skipped: relSkipped, protected_published: relProtected },
  };
}

/** CMS API 使用：导入后保持 pool 不关闭；CLI 直接用时关闭。 */
export async function commitDraftAndClose(draft: PortalDraft): Promise<CommitResult> {
  try {
    return await commitDraft(draft);
  } finally {
    await closeDb();
  }
}
