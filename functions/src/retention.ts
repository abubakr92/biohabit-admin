import type { UserRecord } from 'firebase-admin/auth';
import { adminAuth, db } from './firebase';

/**
 * Build 1, guest data retention (client decision 11 Nov): a guest account nobody has used for 30 days
 * is deleted with all its data. A guest who created an account before then keeps everything.
 *
 * Firebase's own anonymous-account cleanup is deliberately not used: it counts from creation, and a
 * guest who has used the app every day for a month would be deleted by it.
 */
export const GUEST_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * A guest is an Auth account with no sign-in method linked. Turning a guest into an account links an
 * email, Google or Apple sign-in to the same uid, so a converted guest is never a guest here.
 */
export const isGuest = (user: UserRecord) => user.providerData.length === 0 && !user.email && !user.phoneNumber;

const millis = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  const time = value as { toMillis?: () => number } | null | undefined;
  return time?.toMillis?.() ?? 0;
};

/**
 * The latest sign the guest used the app: `users/{uid}.lastOpenAt` once the app writes it on every
 * open; until then the last ID-token refresh, which the app's SDK renews whenever it is used after an
 * hour away; then last sign-in and creation, so an account with neither still has an age.
 */
export function lastUse(user: UserRecord, lastOpenAt: unknown) {
  const { lastRefreshTime, lastSignInTime, creationTime } = user.metadata;
  return Math.max(millis(lastOpenAt), Date.parse(lastRefreshTime ?? '') || 0, Date.parse(lastSignInTime ?? '') || 0, Date.parse(creationTime ?? '') || 0);
}

/** Counts and dates only: nothing in it identifies an account, so it is safe to log and to report. */
export interface RetentionReport {
  ranAt: string;
  cutoff: string;
  applied: boolean;
  accounts: number;
  guests: number;
  unusedFor: { under7Days: number; from7To30Days: number; over30Days: number };
  expired: number;
  deleted: number;
  skippedOnRecheck: number;
  failed: number;
}

/**
 * Finds every guest unused for longer than the retention period and, with `apply`, deletes it.
 * Without `apply` it changes nothing and only counts: that is the dry run.
 */
export async function runGuestRetention({ apply, now = Date.now() }: { apply: boolean; now?: number }): Promise<RetentionReport> {
  const cutoff = now - GUEST_RETENTION_DAYS * DAY_MS;
  const report: RetentionReport = {
    ranAt: new Date(now).toISOString(), cutoff: new Date(cutoff).toISOString(), applied: apply,
    accounts: 0, guests: 0, unusedFor: { under7Days: 0, from7To30Days: 0, over30Days: 0 }, expired: 0, deleted: 0, skippedOnRecheck: 0, failed: 0,
  };

  let pageToken: string | undefined;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    pageToken = page.pageToken;
    report.accounts += page.users.length;
    const guests = page.users.filter(isGuest);
    report.guests += guests.length;
    if (!guests.length) continue;

    // Only the one field this needs is read from each profile.
    const profiles = await db.getAll(...guests.map((user) => db.collection('users').doc(user.uid)), { fieldMask: ['lastOpenAt'] });
    for (const [index, user] of guests.entries()) {
      const unused = (now - lastUse(user, profiles[index].get('lastOpenAt'))) / DAY_MS;
      if (unused < 7) report.unusedFor.under7Days += 1;
      else if (unused <= GUEST_RETENTION_DAYS) report.unusedFor.from7To30Days += 1;
      else report.unusedFor.over30Days += 1;
      if (unused <= GUEST_RETENTION_DAYS) continue;
      report.expired += 1;
      if (!apply) continue;
      try {
        report[(await deleteGuestIfStillExpired(user.uid, cutoff)) ? 'deleted' : 'skippedOnRecheck'] += 1;
      } catch {
        report.failed += 1;
      }
    }
  } while (pageToken);
  return report;
}

/**
 * Looks again right before deleting, because the list can be minutes old: a guest who has just
 * opened the app or created an account in the meantime is left alone.
 *
 * Data goes first and the Auth user last. If the Auth delete then failed, tomorrow's run finds the
 * account again and finishes; the other order would leave data that no run can find. Deleting the
 * profile also fires `cleanupDeletedAccount`, like any other account deletion.
 */
export async function deleteGuestIfStillExpired(uid: string, cutoff: number) {
  const user = await adminAuth.getUser(uid);
  const profile = db.collection('users').doc(uid);
  const [fresh] = await db.getAll(profile, { fieldMask: ['lastOpenAt'] });
  if (!isGuest(user) || lastUse(user, fresh.get('lastOpenAt')) >= cutoff) return false;
  await db.recursiveDelete(profile);
  await adminAuth.deleteUser(uid);
  return true;
}
