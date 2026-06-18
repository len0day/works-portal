/** Fetch helper：自动抛错 + 提供常用 CRUD 方法 */
export async function api<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `请求失败 (${res.status})`);
  }
  return data as T;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('zh-CN');
  } catch {
    return '—';
  }
}
