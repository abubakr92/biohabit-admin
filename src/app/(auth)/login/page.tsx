'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf, LockKeyhole, Mail } from 'lucide-react';
import { useLogin } from '@/lib/hooks/use-auth';

const schema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@biohabit.app', password: '' },
  });
  const submit = (values: Values) => {
    setServerError('');
    login.mutate(values, {
      onSuccess: () => router.push('/stacks'),
      onError: (error) => setServerError(error.message),
    });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef2f0] p-5">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#236b5b] text-white">
            <Leaf className="size-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">BIOHABIT</p>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">
              Admin panel
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit(submit)}
          className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9"
        >
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage BIOHABIT content.</p>
          {serverError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {serverError}
            </div>
          )}
          <div className="mt-7 space-y-5">
            <label className="block text-sm font-semibold">
              Email
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                <input className="field pl-10" autoComplete="email" {...register('email')} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </label>
            <label className="block text-sm font-semibold">
              Password
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-3 size-4 text-slate-400" />
                <input
                  type="password"
                  className="field pl-10"
                  autoComplete="current-password"
                  placeholder="Enter your Firebase password"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </label>
          </div>
          <button className="btn btn-primary mt-7 w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-5 text-center text-xs text-slate-400">
            Firebase access requires an authorised admin account
          </p>
        </form>
      </div>
    </main>
  );
}
