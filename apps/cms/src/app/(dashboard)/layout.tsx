import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email} role={user.role} />
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
