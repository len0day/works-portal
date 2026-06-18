// 从 monorepo 共享的 @works/db 取 drizzle client 与 schema
export { db, schema, closeDb } from '@works/db';
export type { DB } from '@works/db';
