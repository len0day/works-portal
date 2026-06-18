import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export { schema };

const DEFAULT_URL = 'postgresql://learningai:password@localhost:5433/learningai';
const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_URL;

if (!process.env.DATABASE_URL) {
  // 仅本地开发提示，不阻断
  console.warn('[@works/db] DATABASE_URL 未设置，使用默认 localhost:5433');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;

export async function closeDb(): Promise<void> {
  await pool.end();
}
