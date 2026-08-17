# BIOHABIT Admin API contract

All endpoints return JSON. The base URL is `NEXT_PUBLIC_API_BASE_URL`; paths below are relative to it. Except for `/health`, requests include `Authorization: Bearer <Firebase ID token>`. Successful mutation responses contain the updated resource directly. Errors use:

```ts
{ message: string; fieldErrors?: Record<string, string[]> }
```

`fieldErrors` is keyed by dotted field path — `description.nl`, `title.en`, `startTime` — so the admin panel can show each message on the field that produced it. Failures that belong to no single field are reported in `message` alone.

## Shared models

`Bilingual` is `{ nl: string; en: string }`. Enum values and full resource interfaces are canonical in `src/types/models.ts`. Times are 24-hour `HH:mm` and are validated against that format on both sides; timestamps use ISO 8601 strings. `modeDurations` and usage counts are read-only, server-derived values.

## Auth

| Method | Path            | Request               | Response                                        |
| ------ | --------------- | --------------------- | ----------------------------------------------- |
| GET    | `/health`       | none                  | `{ ok: true; project: string; region: string }` |
| GET    | `/auth/session` | Firebase bearer token | `{ user: SessionUser }` or `401`/`403`          |

Email/password sign-in uses the Firebase Web SDK rather than sending credentials to the BIOHABIT API. The ID token is verified with revocation checking on every request, so disabling an account in the Firebase Console ends its access immediately rather than at token expiry.

Authorisation accepts either the `admin` custom claim or a Firestore `users/{uid}` profile with `accessLevel: 'admin'`; `npm --prefix functions run set-admin` sets both. Firestore Security Rules recognise **only the custom claim**, because reading a profile document there would consume one of the ten document-access calls a rules request is allowed. `SessionUser` is `{ id: string; email: string; accessLevel: AccessLevel }`.

After successful authorisation the Next.js route `/api/auth/firebase-session` sets an httpOnly presence cookie that middleware uses for routing only; it carries no identity and grants no access. Middleware refreshes it on each matched request so an active session is not interrupted at a fixed age. The Firebase ID token is the sole authority for backend access.

Browser calls are restricted by CORS to the origins listed in `ADMIN_ORIGINS` (see `functions/.env.example`). Each authenticated caller is limited to 120 requests per minute per instance; exceeding it returns `429`.

## Stacks

| Method | Path                    | Request                                                                       | Response                                      |
| ------ | ----------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| GET    | `/stacks`               | Optional query filters: `search`, `functionTag`, `label`, `daypart`, `active` | `Stack[]`                                     |
| GET    | `/stacks/:id`           | none                                                                          | `Stack`                                       |
| POST   | `/stacks`               | `StackInput`                                                                  | `Stack`                                       |
| PATCH  | `/stacks/:id`           | `Partial<StackInput>`                                                         | `Stack`                                       |
| DELETE | `/stacks/:id`           | none                                                                          | `204`; also deletes the stack's context rows  |
| POST   | `/stacks/:id/duplicate` | none                                                                          | New inactive `Stack` with copied context rows |

`StackInput` contains `title`, `description`, `coherence`, `suggestedTiming`, `functionTag`, `primaryLabel`, `supportingLabels`, `level`, `daypart`, `isPremium`, and `isActive`. The server supplies `id`, timestamps, `actionCount`, and derived `modeDurations`.

**Classification.** Stacks are classified on three axes: `primaryLabel` (plus `supportingLabels`), `functionTag`, and `daypart` (`morning | midday | evening`). `daypart` is `null` on a draft and required to publish. `level` is a separate quality — the mode tier the stack is written for.

**`level` and `Mode` share three words but are not the same field.** `level` (`essential | balanced | full`) describes how demanding the stack is overall; a context row's `includedInMode` decides from which mode that row starts appearing. Every stack still spans all three modes regardless of its `level`.

**Draft rule.** A stack needs only `title` (NL and EN) and a `primaryLabel` to be saved. `description`, `coherence`, `suggestedTiming` (both languages) and `daypart` become required when `isActive` is `true`; activating an incomplete stack returns `422` listing each missing field. The client schema in `src/lib/validation/stack.ts` mirrors this exactly.

Duplicating a stack rewrites `relativeToContextId` on the copied rows to point at the copies, so a duplicate never references its source.

## Context rows

| Method | Path                            | Request                              | Response                                      |
| ------ | ------------------------------- | ------------------------------------ | --------------------------------------------- |
| GET    | `/stacks/:stackId/context-rows` | none                                 | `ContextRow[]`, ascending by `stackSortOrder` |
| POST   | `/stacks/:stackId/context-rows` | `ContextRowInput`                    | `ContextRow`                                  |
| PATCH  | `/context-rows/:id`             | `Partial<ContextRowInput>`           | `ContextRow`                                  |
| DELETE | `/context-rows/:id`             | none                                 | `204`; `409` when another row depends on it   |
| POST   | `/context-rows/reorder`         | `{ stackId: string; ids: string[] }` | `204`                                         |

`ContextRowInput` is the `ContextRow` interface without `id` and `stackId`. The API validates conditional timing fields (`exact`, `window` and `anchor` need `startTime`; `window` needs an `endTime` after it; `relative` needs a target and bilingual dependency text) and that `relativeToContextId` names an earlier row in the same stack.

**Reorder rule.** `ids` must contain every row of the stack exactly once, and the resulting order must keep each `relative` row after the row it depends on. An order that would invert a dependency returns `422` and names the offending rows, so a drag cannot leave a row un-editable.

## Micro-actions

| Method | Path                 | Request                                   | Response                                            |
| ------ | -------------------- | ----------------------------------------- | --------------------------------------------------- |
| GET    | `/micro-actions`     | Optional query filters: `search`, `label` | `MicroAction[]`                                     |
| GET    | `/micro-actions/:id` | none                                      | `MicroAction`                                       |
| POST   | `/micro-actions`     | `MicroActionInput`                        | `MicroAction`                                       |
| PATCH  | `/micro-actions/:id` | `Partial<MicroActionInput>`               | `MicroAction`                                       |
| DELETE | `/micro-actions/:id` | none                                      | `204`; `409` with dependent stack names when in use |

`MicroActionInput` contains `title`, `effect`, `howTo`, `warning`, `labels`, `durationMin`, and `level`. The server supplies `id` and `usedInStacksCount`.

## Labels

| Method | Path          | Request                                     | Response                                   |
| ------ | ------------- | ------------------------------------------- | ------------------------------------------ |
| GET    | `/labels`     | none                                        | `Label[]`                                  |
| POST   | `/labels`     | `{ key: string; name: Bilingual }`          | `Label`                                    |
| PATCH  | `/labels/:id` | `Partial<{ key: string; name: Bilingual }>` | `Label`                                    |
| DELETE | `/labels/:id` | none                                        | `204`; `409` with usage detail when in use |

The server supplies `id` and `usageCount`.

**Key rule.** Stacks and micro-actions reference labels by `key`, not by document ID. Changing the `key` of a label that is in use returns `409` listing the referencing records, because a rename would otherwise orphan every reference and silently drop the label's usage count to zero. Display names (`name.nl`, `name.en`) can be edited at any time.

## Users

| Method | Path                | Request                                                                       | Response                                           |
| ------ | ------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| GET    | `/users`            | `status=all\|silent\|unlocked\|locked`, `limit` (1–200, default 50), `cursor` | `{ users: AppUser[]; nextCursor: string \| null }` |
| POST   | `/users/:id/unlock` | none                                                                          | Updated `AppUser`                                  |

This collection grows with every app signup and is never returned whole. Filtering and paging both happen in Firestore: pass the `nextCursor` from a response back as `cursor` to fetch the following page, and treat a `null` `nextCursor` as the end of the list. A cursor that no longer resolves returns `400`. `silent` means no check-off in the last three days, including testers who have never checked off.

## Status codes

- `200` successful reads and updates
- `201` successful creates
- `204` successful deletions/reorders when no body is returned
- `400` malformed input or an expired pagination cursor
- `401` missing, expired or revoked session
- `403` authenticated but not an admin
- `404` resource or endpoint not found
- `409` blocked because a resource is in use
- `422` field validation failure, with `fieldErrors` keyed by dotted path
- `429` rate limit exceeded
- `500` unexpected server error
