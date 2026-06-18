import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type SessionPayload } from './jwt';

/** 在 Server Component / Route Handler 中取当前登录管理员，未登录返回 null */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** 要求登录，否则抛错（由上层捕获转 401） */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
