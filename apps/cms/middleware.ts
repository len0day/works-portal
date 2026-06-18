import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * 独立认证：校验 portal_session cookie（与 AiForKids 的 admin-session 完全不同的 cookie 名/密钥）。
 * 仅保护页面路由；/login 与 /api/* 自行处理鉴权。
 */
const SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET ?? 'dev-insecure-secret');
const COOKIE = 'portal_session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login') {
    return NextResponse.next();
  }
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}

export const config = {
  // 触发除 API / 静态资源外的所有路由
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
