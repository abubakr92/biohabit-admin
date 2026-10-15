# Build 8 — admin panel changes the app needs to know about

For the mobile developer. Covers what the admin side added for the Build 8 open items (13 Oct),
what is now live in Firestore, and what the app has to do to use it. Nothing of the app's was
changed: no Cloud Function of yours, no existing collection or field, no user data.

## What is live

All of the following is deployed to the `biohabit` project:

| Change                                                               | Where                      | State                              |
| -------------------------------------------------------------------- | -------------------------- | ---------------------------------- |
| New collection `moments`                                             | Firestore                  | Empty until the client fills it in |
| New rule block `match /moments/{momentKey}`                          | Firestore rules            | Live                               |
| New optional field `defaultAnchors` on `stacks`                      | Firestore                  | Set on 3 stacks                    |
| `GET /moments`, `PATCH /moments/:key`, `defaultAnchors` on `/stacks` | Admin API (`api` function) | Live                               |

### Security rules: please read before your next rules deploy

One block was **added** to the production ruleset. Nothing else in it changed:

```
match /moments/{momentKey} {
  allow read: if signedIn();
  allow write: if isAdmin();
}
```

If you deploy rules from your own repo, add this block there too. Otherwise your deploy removes it
and members can no longer read the moments. The admin repo keeps an exact copy of the live rules in
`firestore.rules`.

## 1. Moments (open item C1)

`moments/{key}`: one document per moment. The keys are the ones the app already writes to
`users/{uid}.baseMoments`:

| key          | sortOrder | English name  |
| ------------ | --------- | ------------- |
| `wake`       | 0         | Wake up       |
| `firstMeal`  | 1         | First meal    |
| `workStart`  | 2         | Start of work |
| `secondMeal` | 3         | Second meal   |
| `workEnd`    | 4         | End of work   |
| `lastMeal`   | 5         | Last meal     |
| `bed`        | 6         | Bed           |

```ts
{
  label: {
    nl: string;
    en: string;
  }
  daypart: 'morning' | 'midday' | 'evening';
  defaultTime: string; // "HH:mm", 24-hour
  sortOrder: number; // 0–6
  updatedAt: string; // ISO
}
```

- A document is only written once **all** values are filled in, so a document that exists is
  complete. A moment the client has not configured yet has **no document**. Until all seven exist,
  keep the app's built-in values as the fallback for any missing key.
- Dutch names, dayparts and default times are entered by the client in the panel; none were
  invented. Read them; don't hard-code them.
- Order by `sortOrder`.

## 2. Default anchor per stack segment (C1)

`stacks/{id}.defaultAnchors`, optional; absent or `{}` means no anchor configured:

```ts
defaultAnchors: {
  morning?: StackAnchor;
  midday?: StackAnchor;
  evening?: StackAnchor;
}
StackAnchor = { moment: MomentKey | null; offsetMin: number; fixedTime: string | null }
```

- **Segments are keyed by daypart**, the same way you key a routine's `moments`. A segment is the
  stack's own daypart plus any daypart a row overrides to.
- Exactly one of `moment` / `fixedTime` is set.
  - Moment anchor: **anchor = the user's `baseMoments[moment]`, else `moments/{moment}.defaultTime`,
    plus `offsetMin`** (−720…720; negative = before the moment).
  - Fixed anchor: `fixedTime`; nothing moves it, and `offsetMin` is 0.
- The first action of a segment starts at the anchor. Each action without its own time starts when
  the one above it ends (start + duration). There is no 07:00 fallback.

Set so far (the three the client confirmed):

| Stack             | id        | Segment | Anchor                                   |
| ----------------- | --------- | ------- | ---------------------------------------- |
| Evening Wind-Down | `stack-4` | evening | `{ moment: 'bed', offsetMin: -90 }`      |
| Skin & Collagen   | `stack-8` | morning | `{ moment: 'firstMeal', offsetMin: 0 }`  |
| Glucose Glide     | `stack-6` | midday  | `{ moment: 'secondMeal', offsetMin: 0 }` |

The other five stacks have none yet; the client will set them in the panel. Until a stack has one,
keep its current behaviour (your change log: new stacks start on "fixed time").

### Base moments vs. the app's moment list

The app's routines store derived moments such as `windDown` and `withLunch` (the 30 Sept
instruction, C4: moment = base moment + preset offset). The panel stores the **base** moment plus
the **whole** offset: Evening Wind-Down is `bed −90`, which is your `windDown` with an extra stack
offset of 0. Both give the same clock time. How you map one onto the other when prefilling the
planning sheet from a stack is your call. The anchor formula above is the source of truth.

## 3. Things to check against the catalogue (D6/D7)

None of these needed a data change; they're listed so the app reads them the same way the panel does.

- **Function on a composition row:** `contextRows.functionTag` null means the row takes its
  **stack's** `functionTag`. Nine rows carry an older stored value that differs from their stack's;
  the panel shows those as overrides and the client may clear them.
- **Depth:** `contextRows.includedInMode`: an Essential row is in all three depths, a Balanced row
  in Balanced and Full, a Full row in Full only. Every row has a value.
- **Minutes per depth:** `durationOverrideMin ?? microAction.durationMin`, summed over every row in
  that depth, **optional rows included**. Subtract only rows the member switched off. Panel totals:
  Evening Wind-Down 4/8/23, Skin & Collagen 11/13/16, Morning Start 7/17/30.
- **Labels:** `stacks.primaryLabel` + `stacks.supportingLabels`, by key against `labels` (8 keys:
  energy, sleep, gut, brain, stress, hormones, movement, skin).
- **Daypart:** `stacks.daypart` may be null ("Not set"): still recommendable, no daypart bonus.
- **Active:** `stacks.isActive`.
- **Sort order:** `stacks.stackOrder`. It is **missing** on Morning Start, Focus Primer, Glucose
  Glide and Energy Boost; read missing as 0. The client is asked to set distinct values.

## 4. Seen in live data, for you to look at

Routine data is yours, so the admin side did not change it:

- Many seeded routine actions are still stored at `07:00`, `07:01`, … (open item A2), including
  series planned on 9 and 13 Oct.
- One Skin & Collagen series planned on 9 Oct has an action stored at `00:21`.
- Routine actions store `depth` as `light / medium / deep`. The panel now displays these as
  Essential / Balanced / Full; the stored values were not touched.
