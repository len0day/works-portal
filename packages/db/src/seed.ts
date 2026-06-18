import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { portal_admins } from './schema';

/**
 * 创建首个管理员账号（幂等）。
 * 通过环境变量 PORTAL_ADMIN_EMAIL / PORTAL_ADMIN_PASSWORD 配置。
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'postgresql://learningai:password@localhost:5433/learningai';
  const email = process.env.PORTAL_ADMIN_EMAIL ?? 'admin@portal.local';
  const password = process.env.PORTAL_ADMIN_PASSWORD ?? 'admin123';

  if (password.length < 8) {
    console.error('[seed] 密码至少 8 位，拒绝创建弱密码管理员');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const hash = await bcrypt.hash(password, 12);

  const result = await db
    .insert(portal_admins)
    .values({ email, password_hash: hash, name: 'Admin', role: 'admin' })
    .onConflictDoUpdate({
      target: portal_admins.email,
      set: { password_hash: hash, updated_at: new Date() },
    })
    .returning({ id: portal_admins.id, email: portal_admins.email });

  console.log(`[seed] 管理员已就绪: id=${result[0]?.id} email=${result[0]?.email}`);
  console.log(`[seed] 请用 ${email} / <你设置的密码> 登录 CMS`);

  await pool.end();
}

main().catch((e) => {
  console.error('[seed] 失败:', e);
  process.exit(1);
});
