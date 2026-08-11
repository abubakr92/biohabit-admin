import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth, type User } from 'firebase/auth';
import { env } from '@/config/env';

let authInstance: Auth | null = null;
let emulatorConnected = false;

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  if (!env.firebase.apiKey || !env.firebase.projectId || !env.firebase.appId)
    throw new Error('Firebase Web configuration is incomplete.');
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  authInstance = getAuth(app);
  if (env.firebaseUseEmulators && !emulatorConnected) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
    emulatorConnected = true;
  }
  return authInstance;
}

export async function waitForFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  return auth.currentUser;
}

export async function getFirebaseAuthToken() {
  const user = await waitForFirebaseUser();
  return user?.getIdToken() ?? null;
}
