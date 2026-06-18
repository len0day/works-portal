'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderGit2, FileClock, Send, Settings, LogOut } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/projects', label: '项目', icon: FolderGit2 },
  { href: '/releases', label: '版本日志', icon: FileClock },
  { href: '/distribute', label: '多平台分发', icon: Send },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      <div className="px-5 py-5">
        <div className="text-sm font-bold">作品门户</div>
        <div className="text-xs text-muted-foreground">CMS 后台</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
          {email} · {role}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> 退出登录
        </button>
      </div>
    </aside>
  );
}
