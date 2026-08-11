import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/sidebar';
import { AuthGuard } from '@/components/layout/auth-guard';
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Sidebar />
      <div className="min-h-screen lg:pl-60">
        <div className="border-b border-slate-200 bg-white px-5 py-3 lg:hidden">
          <span className="font-bold">BIOHABIT Admin</span>
          <div className="mt-2 flex gap-4 text-sm">
            <Link href="/stacks">Stacks</Link>
            <Link href="/micro-actions">Actions</Link>
            <Link href="/labels">Labels</Link>
            <Link href="/users">Users</Link>
          </div>
        </div>
        <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
