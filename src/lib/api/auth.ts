import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { SessionUser } from '@/types/api';
import { env } from '@/config/env';
import { getFirebaseAuth, waitForFirebaseUser } from '@/lib/firebase/client';
import { ApiError, apiRequest } from './client';
import { endpoints } from './endpoints';
export async function login(email: string, password: string) {
  if (env.useMocks) {
    const result = await apiRequest<{ user: SessionUser }>(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return result.user;
  }
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  try {
    const result = await apiRequest<{ user: SessionUser }>(endpoints.auth.session);
    await fetch('/api/auth/firebase-session', { method: 'POST', credentials: 'include' });
    return result.user;
  } catch (error) {
    await signOut(getFirebaseAuth());
    throw error;
  }
}
export async function logout() {
  if (!env.useMocks) await signOut(getFirebaseAuth());
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
export async function getSession() {
  try {
    if (!env.useMocks && !(await waitForFirebaseUser())) return null;
    const result = await apiRequest<{ user: SessionUser }>(endpoints.auth.session);
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}
