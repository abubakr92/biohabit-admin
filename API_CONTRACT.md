# BIOHABIT Admin API contract

All endpoints return JSON. The base URL is `NEXT_PUBLIC_API_BASE_URL`; paths below are relative to it. Except for `/health`, requests include `Authorization: Bearer <Firebase ID token>`. The API verifies the token and requires an administrator custom claim or an admin Firestore user profile. Successful mutation responses contain the updated resource directly. Errors use:

```ts
{ message: string; fieldErrors?: Record<string, string[]> }
```

## Shared models

`Bilingual` is `{ nl: string; en: string }`. Enum values and full resource interfaces are canonical in `src/types/models.ts`. Times use `HH:mm`; timestamps use ISO 8601 strings. `modeDurations` and usage counts are read-only, server-derived values.

## Auth

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | none | `{ ok: true; project: string; region: string }` |
| GET | `/auth/session` | Firebase bearer token | `{ user: SessionUser }` or `401`/`403` |

Email/password sign-in uses the Firebase Web SDK rather than sending credentials to the BIOHABIT API. After successful authorization, the Next.js route `/api/auth/firebase-session` sets an httpOnly presence cookie for middleware routing. The Firebase ID token—not that routing cookie—is the authority for backend access. `SessionUser` is `{ id: string; email: string; accessLevel: AccessLevel }`; only `accessLevel: "admin"` is authorised.

## Stacks

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/stacks` | Optional query filters: `search`, `functionTag`, `daypart`, `label`, `active` | `Stack[]` |
| GET | `/stacks/:id` | none | `Stack` |
| POST | `/stacks` | `StackInput` | `Stack` |
| PATCH | `/stacks/:id` | `Partial<StackInput>` | `Stack` |
| POST | `/stacks/:id/duplicate` | none | New inactive `Stack` with copied context rows |

`StackInput` contains `title`, `description`, `coherence`, `suggestedTiming`, `functionTag`, `primaryLabel`, `supportingLabels`, `level`, `isPremium`, and `isActive`. The server supplies `id`, timestamps, `actionCount`, and derived `modeDurations`.

## Context rows

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/stacks/:stackId/context-rows` | none | `ContextRow[]`, ascending by `stackSortOrder` |
| POST | `/stacks/:stackId/context-rows` | `ContextRowInput` | `ContextRow` |
| PATCH | `/context-rows/:id` | `Partial<ContextRowInput>` | `ContextRow` |
| DELETE | `/context-rows/:id` | none | `204` or empty JSON body |
| POST | `/context-rows/reorder` | `{ stackId: string; ids: string[] }` | `204` or empty JSON body |

`ContextRowInput` is the `ContextRow` interface without `id` and `stackId`. The API must validate cumulative `includedInMode`, conditional timing fields, and that `relativeToContextId` is an earlier row in the same stack.

## Micro-actions

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/micro-actions` | Optional query filters: `search`, `label` | `MicroAction[]` |
| GET | `/micro-actions/:id` | none | `MicroAction` |
| POST | `/micro-actions` | `MicroActionInput` | `MicroAction` |
| PATCH | `/micro-actions/:id` | `Partial<MicroActionInput>` | `MicroAction` |
| DELETE | `/micro-actions/:id` | none | `204`; `409` with dependent stack names when in use |

`MicroActionInput` contains `title`, `effect`, `howTo`, `warning`, `labels`, `durationMin`, and `level`. The server supplies `id` and `usedInStacksCount`.

## Labels

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/labels` | none | `Label[]` |
| POST | `/labels` | `{ key: string; name: Bilingual }` | `Label` |
| PATCH | `/labels/:id` | `Partial<{ key: string; name: Bilingual }>` | `Label` |
| DELETE | `/labels/:id` | none | `204`; `409` with usage detail when in use |

The server supplies `id` and `usageCount`.

## Users

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/users` | Optional query filter: `status=all|silent|unlocked|locked` | `AppUser[]` |
| POST | `/users/:id/unlock` | none | Updated `AppUser` |

## Status codes

- `200` successful reads and updates
- `201` successful creates
- `204` successful deletions/reorders when no body is returned
- `400` malformed input
- `401` missing or expired session
- `403` authenticated but not an admin
- `404` resource not found
- `409` deletion blocked because a resource is in use
- `422` field validation failure
- `500` unexpected server error
