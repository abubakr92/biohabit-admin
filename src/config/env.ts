// Mocks are opt-in. A build without NEXT_PUBLIC_USE_MOCKS talks to the real API rather than
// silently serving in-memory data that looks like it saved but never reaches Firestore.
export const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',
  useMocks,
  firebaseUseEmulators: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true',
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  },
};
