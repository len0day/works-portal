import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(schema.portal_admins)
    .where(eq(schema.portal_admins.email, email))
    .limit(1);
  const admin = rows[0];
  if (!admin) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
  }

  const token = await signSession({ sub: admin.id, email: admin.email, role: admin.role });
  await db
    .update(schema.portal_admins)
    .set({ last_login_at: new Date() })
    .where(eq(schema.portal_admins.id, admin.id));

  const res = NextResponse.json({
    user: { email: admin.email, role: admin.role, name: admin.name },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return res;
}
