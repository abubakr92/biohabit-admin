# BIOHABIT Admin

The BIOHABIT content administration panel and Firebase backend. The connected Firebase project is `biohabit`; Firestore and Cloud Functions are located in `europe-west4`.

## Current Firebase status

- Firebase Web App `biohabit-admin` is registered.
- Firestore Security Rules and indexes are deployed.
- The live Firestore database contains 8 labels, 25 micro-actions, 8 stacks, and 32 context rows.
- The `api` Cloud Function is deployed on Node.js 22.
- Local Auth, Firestore, and Functions emulators are configured and tested.
- The live function is publicly invokable so the browser app can reach it. All data endpoints still require and verify a Firebase admin ID token; only `/health` is unauthenticated.

## Local Firebase development

The checked-out `.env.local` uses the Firebase emulators rather than mock data or production data.

Start the emulators in one terminal:

```powershell
npm run firebase:emulators
```

Seed them in another terminal:

```powershell
npm run firebase:seed
```

Start Next.js:

```powershell
npm run dev
```

Open `http://localhost:3000` and use:

```text
Email: admin@biohabit.app
Password: biohabit-dev
```

The emulator UI is available at `http://127.0.0.1:4000`.

## Environment modes

### In-memory mocks

```env
NEXT_PUBLIC_USE_MOCKS=true
```

### Firebase emulators

```env
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001/biohabit/europe-west4/api
```

### Live Firebase

```env
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false
NEXT_PUBLIC_API_BASE_URL=https://europe-west4-biohabit.cloudfunctions.net/api
```

The Firebase Web configuration variables in `.env.example` are public client identifiers. Never commit service-account JSON credentials.

## Creating the first live administrator

1. Enable Email/Password in Firebase Authentication.
2. Create the administrator account in Firebase Console → Authentication → Users.
3. With Application Default Credentials configured, run:

```powershell
npm --prefix functions run set-admin -- your-email@example.com
```

This adds the Firebase `admin` custom claim and creates/updates the matching Firestore `users/{uid}` profile. Never expose this capability as a public endpoint.

## Firebase commands

```powershell
npm run firebase:functions:build
npm run firebase:emulators
npm run firebase:seed
npm run firebase:deploy
```

The live seed is idempotent and guarded by `CONFIRM_LIVE_SEED=biohabit`. It never deletes collections.

## Project conventions

- `functions/src`: authenticated Cloud Functions REST API and Firestore repository.
- `firestore.rules`: mobile read access and server-only writes.
- `firestore.indexes.json`: required compound indexes.
- `src/lib/firebase`: Firebase Web Auth initialization and emulator connection.
- `src/lib/api`: one fetch client, endpoint registry, and typed functions per resource.
- `src/lib/hooks`: TanStack Query hooks and cache invalidation.
- `src/lib/mock`: fallback in-memory data adapter.
- `src/lib/validation`: client-side zod schemas used by react-hook-form.

The complete backend request and response contract is documented in [API_CONTRACT.md](./API_CONTRACT.md).
