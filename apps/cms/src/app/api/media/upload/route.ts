import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

function extFromMime(mime: string, name: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  if (map[mime]) return map[mime];
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'bin';
}

/** POST /api/media/upload — 接收 multipart 'file' 图片，保存到 public/uploads，返回 {url} */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const data = await req.formData().catch(() => null);
  if (!data) return NextResponse.json({ error: '请求格式错误' }, { status: 400 });

  const file = data.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '缺少文件字段 file' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '仅支持图片（image/*）' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '文件超过 5MB' }, { status: 400 });
  }

  const ext = extFromMime(file.type, file.name);
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: `不支持的图片格式: ${ext}` }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buf);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    filename,
    size: file.size,
    mime: file.type,
  });
}
