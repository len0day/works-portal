import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '作品门户 · 后台管理',
  description: '管理作品展示内容与多平台分发',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
