import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'portal_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

const getSecret = (): Uint8Array =>
  new TextEncoder().encode(process.env.PORTAL_JWT_SECRET ?? 'dev-insecure-secret');

export interface SessionPayload {
  sub: string; // admin id
  email: string;
  role: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub ?? '',
      email: String(payload.email ?? ''),
      role: String(payload.role ?? 'editor'),
    };
  } catch {
    return null;
  }
}
