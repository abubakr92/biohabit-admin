'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers3, ListChecks, Tags, Users, LogOut, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLogout } from '@/lib/hooks/use-auth';
const groups = [
  {
    label: 'Content',
    links: [
      { href: '/stacks', label: 'Stacks', icon: Layers3 },
      { href: '/micro-actions', label: 'Micro-actions', icon: ListChecks },
      { href: '/labels', label: 'Labels', icon: Tags },
    ],
  },
  { label: 'People', links: [{ href: '/users', label: 'Users', icon: Users }] },
];
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useLogout();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-[#fbfcfc] lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#236b5b] text-white">
          <Leaf className="size-5" />
        </div>
        <div>
          <p className="font-bold tracking-tight">BIOHABIT</p>
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">
            Admin panel
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-7 px-3 py-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                      active
                        ? 'bg-[#eaf5f1] text-[#195548]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <link.icon className="size-[18px]" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate px-2 text-xs font-medium text-slate-600">admin@biohabit.app</p>
        <button
          className="mt-3 flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => signOut.mutate(undefined, { onSuccess: () => router.push('/login') })}
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
