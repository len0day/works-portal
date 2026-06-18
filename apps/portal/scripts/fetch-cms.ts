/**
 * 构建前从 PostgreSQL 拉取已发布内容 → src/data/*.json。
 * DB 不可用时降级为空数组（站点仍可构建，永不挂）。
 */
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../src/data');

const url = process.env.DATABASE_URL ?? 'postgresql://learningai:password@localhost:5433/learningai';
const NAMES = ['projects', 'features', 'highlights', 'releases', 'media'] as const;

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  try {
    const client = await pool.connect();
    const [projects, features, highlights, releases, media] = await Promise.all([
      client.query("SELECT * FROM portal_projects WHERE status='published' ORDER BY sort_order, created_at"),
      client.query("SELECT * FROM portal_features WHERE status='published' ORDER BY sort_order"),
      client.query("SELECT * FROM portal_highlights WHERE status='published' ORDER BY sort_order"),
      client.query("SELECT * FROM portal_releases WHERE status='published' ORDER BY date DESC NULLS LAST, sort_order"),
      client.query("SELECT * FROM portal_media WHERE status='published' ORDER BY sort_order"),
    ]);
    client.release();
    const data = { projects: projects.rows, features: features.rows, highlights: highlights.rows, releases: releases.rows, media: media.rows };
    for (const name of NAMES) {
      writeFileSync(resolve(DATA_DIR, `${name}.json`), JSON.stringify(data[name], null, 2));
    }
    console.log(
      `[fetch-cms] projects=${projects.rowCount} features=${features.rowCount} highlights=${highlights.rowCount} releases=${releases.rowCount} media=${media.rowCount}`,
    );
  } catch (e) {
    console.warn(`[fetch-cms] DB 不可用，降级为空数据:`, (e as Error).message);
    for (const name of NAMES) {
      writeFileSync(resolve(DATA_DIR, `${name}.json`), '[]');
    }
  } finally {
    await pool.end();
  }
}

main();
