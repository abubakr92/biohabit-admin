'use client';
import type { ReactNode } from 'react';
import { ShieldX } from 'lucide-react';
import { useSession } from '@/lib/hooks/use-auth';
export function AuthGuard({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Checking access…
      </div>
    );
  if (!session.data || session.data.accessLevel !== 'admin')
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <ShieldX className="mx-auto size-8 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold">Not authorised</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This area is limited to BIOHABIT administrators. Sign in with an admin account to
            continue.
          </p>
          <a className="btn btn-primary mt-6" href="/login">
            Return to sign in
          </a>
        </div>
      </div>
    );
  return children;
}
