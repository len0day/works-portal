import { defineConfig } from 'drizzle-kit';

// 容器内连接走 postgres:5432；本地开发用 localhost:5433（复用 AiForKids 的 learningai 库）
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://learningai:password@localhost:5433/learningai',
  },
  verbose: true,
  strict: true,
});
