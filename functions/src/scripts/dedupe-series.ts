/**
 * Build 1, Admin P1: the duplicate series the daily question left behind.
 *
 * A duplicate is two or more series of one stack under one member. In each group the newest active
 * series stays, or the newest paused one when none is active; the others are deleted. Check-offs
 * are stored against composition rows, not series, so a member's history is unaffected. Nothing else
 * is touched. A series with no stack behind it is the member's own and is never a duplicate.
 *
 * Deleting cannot be undone, so it reports by default. Ids are shortened and no email is printed.
 *
 *   npm --prefix functions run dedupe-series            # report only
 *   npm --prefix functions run dedupe-series -- --apply # delete
 */
export {};

const stamp = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  const time = value as { toMillis?: () => number } | null | undefined;
  return time?.toMillis?.() ?? 0;
};

async function main() {
  const { db } = await import('../firebase');
  const apply = process.argv.includes('--apply');
  const [routines, rows, stacks] = await Promise.all([db.collectionGroup('routines').get(), db.collection('contextRows').get(), db.collection('stacks').get()]);
  const stackOfRow = new Map(rows.docs.map((row) => [row.id, row.get('stackId') as string]));
  const titles = new Map(stacks.docs.map((stack) => [stack.id, stack.get('title.en') as string]));

  const groups = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const routine of routines.docs) {
    const actions = (routine.get('actions') ?? []) as Array<{ id?: string }>;
    const seeded = actions.map((action) => stackOfRow.get(String(action.id ?? '').replace(/^seed-/, ''))).find(Boolean);
    const stackId = (routine.get('stackId') as string | undefined) || seeded;
    if (!stackId) continue;
    const key = `${routine.ref.parent.parent?.id}|${stackId}`;
    groups.set(key, [...(groups.get(key) ?? []), routine]);
  }

  const remove: FirebaseFirestore.DocumentReference[] = [];
  for (const [key, series] of groups) {
    if (series.length < 2) continue;
    const ordered = [...series].sort((a, b) => Number(b.get('enabled') !== false) - Number(a.get('enabled') !== false) || stamp(b.get('createdAt')) - stamp(a.get('createdAt')));
    const [keep, ...rest] = ordered;
    const [uid, stackId] = key.split('|');
    const line = (routine: FirebaseFirestore.QueryDocumentSnapshot) => `${routine.id.slice(0, 6)} ${routine.get('mode')} ${routine.get('enabled') === false ? 'paused' : 'active'} ${new Date(stamp(routine.get('createdAt'))).toISOString().slice(0, 10)}`;
    console.log(`${uid.slice(0, 6)} | ${titles.get(stackId) ?? stackId} x${series.length}\n  keep   ${line(keep)}`);
    rest.forEach((routine) => { console.log(`  delete ${line(routine)}`); remove.push(routine.ref); });
  }

  if (!remove.length) return console.log('\nNo duplicates.');
  if (!apply) return console.log(`\nDry run. Re-run with --apply to delete ${remove.length} series.`);
  const batch = db.batch();
  remove.forEach((reference) => batch.delete(reference));
  await batch.commit();
  console.log(`\nDeleted ${remove.length} series.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
