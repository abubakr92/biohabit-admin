import { env } from '@/config/env';
import type { ApiFieldErrors } from '@/types/api';
import { getFirebaseAuthToken } from '@/lib/firebase/client';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: ApiFieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Compared against the inlined literal rather than env.useMocks so the bundler can prove the
  // branch dead and drop the mock adapter and its seed data from production builds entirely.
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true')
    return (await import('@/lib/mock/adapter')).mockRequest<T>(path, init);
  const headers = new Headers({ 'Content-Type': 'application/json', ...init.headers });
  const token = await getFirebaseAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // The API authorises on the bearer token alone, so no cookies are sent cross-origin.
  const response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    fieldErrors?: ApiFieldErrors;
  } & T;
  if (!response.ok)
    throw new ApiError(response.status, body.message ?? 'Something went wrong.', body.fieldErrors);
  return body;
}
