# BIOHABIT Admin

The BIOHABIT content administration panel and Firebase backend. The connected Firebase project is `biohabit`; Firestore and Cloud Functions are located in `europe-west4`.

## Current Firebase status

- Firebase Web App `biohabit-admin` is registered.
- Firestore Security Rules and indexes are deployed.
- The live Firestore database contains 8 labels, 25 micro-actions, 8 stacks, and 32 context rows.
- The `api` Cloud Function is deployed on Node.js 22.
- Local Auth, Firestore, and Functions emulators are configured and tested.
- The live function is publicly invokable so the browser app can reach it. All data endpoints still require and verify a Firebase admin ID token (with revocation checking); only `/health` is unauthenticated. Browser access is additionally restricted to the origins in `ADMIN_ORIGINS`.

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

Mocks are **opt-in**. A build without `NEXT_PUBLIC_USE_MOCKS` talks to the real API, so a missing
variable can never ship a panel that serves in-memory data and discards every save. Production
builds also drop the mock adapter from the bundle entirely.

### In-memory mocks (local UI work, no backend)

```env
NEXT_PUBLIC_USE_MOCKS=true
```

### Firebase emulators

```env
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001/biohabit/europe-west4/api
```

### Live Firebase

```env
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false
NEXT_PUBLIC_API_BASE_URL=https://europe-west4-biohabit.cloudfunctions.net/api
```

`NEXT_PUBLIC_*` values are inlined at build time, so they must be present in the build environment,
not only at runtime. The Firebase Web configuration variables in `.env.example` are public client
identifiers. Never commit service-account JSON credentials.

The API also needs `ADMIN_ORIGINS` in `functions/.env` — the browser origins allowed to call it.
See `functions/.env.example`. Without it, only same-origin and server-to-server calls succeed.

## Tests

```powershell
npm --prefix functions run test           # 9 schema tests, no emulator needed
npm --prefix functions run test:emulated  # 17 rules + store tests, emulator must be running
```

The emulated suites talk to the Firestore emulator on `127.0.0.1:8080`; start the emulators in
another terminal first. `test:rules` covers member access to active content, the draft/active
split, the document-access budget on `contextRows` queries, and that every client write is
rejected. `test:store` covers the data-integrity rules that only Firestore can prove: the label-key
rename block, reorder dependency validation, duplicate remapping, cascading stack deletion, and
user pagination — including that the `silent` filter still finds testers who have never checked off
(a Firestore inequality filter skips nulls, so that path needs a separate equality query).

If the emulator cannot find a JVM, drop a portable JDK 21 under `.tools/java`; the emulator script
picks it up automatically and the directory is gitignored.

## Live data checks

```powershell
npm --prefix functions run check-users    # read-only; lists user docs missing createdAt
CONFIRM_BACKFILL=biohabit npm --prefix functions run backfill-users
```

`/users` is ordered by `createdAt`, and Firestore's `orderBy` silently omits documents that lack the
field — so a user document written without it never appears in the panel. `check-users` reports any;
`backfill-users` fills them in from the Firebase Auth account creation time, touching only documents
that are missing the field. Make sure the mobile signup path writes `createdAt` so it cannot regress.

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

## Deploy runbook

The Firebase CLI is a dev dependency, so no global install is needed. Authenticating is a one-time
interactive step:

```powershell
npm run firebase:login          # once per machine; opens a browser
npm run firebase:deploy         # rules + indexes + the api function
npm run verify:deployment       # public smoke test; no credentials needed
```

`firebase:deploy` pushes three things together, and they belong together — the API, the security
rules, and the two composite indexes the paginated `/users` queries need. Deploying the function
without the indexes makes the Users filters fail.

**Before the first deploy of the new API, check `functions/.env`.** It sets `ADMIN_ORIGINS`, the
list of browser origins allowed to call the API. It currently contains only `http://localhost:3000`.
Any origin not listed there receives no CORS headers and is blocked by the browser, so **add the
panel's hosted origin before you host it anywhere** — otherwise the deployed panel cannot reach its
own API and it will look like an outage rather than a missing config line.

`verify:deployment` checks health, that data endpoints reject anonymous callers, that unknown routes
are not enumerable, and — the one thing the emulator cannot show, because it injects a permissive
CORS header of its own — that an unknown origin is genuinely refused. Point it at another
deployment with `node scripts/verify-deployment.mjs <apiBaseUrl> <panelOrigin>`.

The live seed is guarded by `CONFIRM_LIVE_SEED=biohabit` and is **create-only**: it writes documents
that do not exist yet and leaves existing ones untouched, so re-running it cannot revert an editor's
changes. It never deletes anything.

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
