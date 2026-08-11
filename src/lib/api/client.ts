import { env } from '@/config/env';
import type { ApiFieldErrors } from '@/types/api';
import { mockRequest } from '@/lib/mock/adapter';
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
  if (env.useMocks && !path.startsWith('/auth/')) return mockRequest<T>(path, init);
  const headers = new Headers({ 'Content-Type': 'application/json', ...init.headers });
  if (!env.useMocks) {
    const token = await getFirebaseAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const baseUrl = env.useMocks && path.startsWith('/auth/') ? '/api' : env.apiBaseUrl;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    fieldErrors?: ApiFieldErrors;
  } & T;
  if (!response.ok)
    throw new ApiError(response.status, body.message ?? 'Something went wrong.', body.fieldErrors);
  return body;
}
