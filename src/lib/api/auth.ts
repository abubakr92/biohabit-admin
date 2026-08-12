import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { SessionUser } from '@/types/api';
import { env } from '@/config/env';
import { getFirebaseAuth, waitForFirebaseUser } from '@/lib/firebase/client';
import { ApiError, apiRequest } from './client';
import { endpoints } from './endpoints';

// Mock mode never leaves the browser: there is no server route that can mint a session.
const MOCK_SESSION_KEY = 'biohabit-mock-session';
const readMockSession = () => {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(MOCK_SESSION_KEY);
  return stored ? (JSON.parse(stored) as SessionUser) : null;
};

export async function login(email: string, password: string) {
  if (env.useMocks) {
    if (!password) throw new ApiError(400, 'Enter your password.');
    const user: SessionUser = { id: 'mock-admin', email, accessLevel: 'admin' };
    window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    await fetch('/api/auth/firebase-session', { method: 'POST' });
    return user;
  }
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  try {
    const result = await apiRequest<{ user: SessionUser }>(endpoints.auth.session);
    await fetch('/api/auth/firebase-session', { method: 'POST' });
    return result.user;
  } catch (error) {
    await signOut(getFirebaseAuth());
    throw error;
  }
}

export async function logout() {
  if (env.useMocks) window.sessionStorage.removeItem(MOCK_SESSION_KEY);
  else await signOut(getFirebaseAuth());
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getSession() {
  if (env.useMocks) return readMockSession();
  try {
    if (!(await waitForFirebaseUser())) return null;
    const result = await apiRequest<{ user: SessionUser }>(endpoints.auth.session);
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}
