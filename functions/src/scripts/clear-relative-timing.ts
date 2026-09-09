/**
 * A8 — the two context rows stored as `relative` by mistake become `none`.
 *
 * Relative timing is not part of Build 1. The rows are corrected rather than the field removed:
 * `relative` stays in the schema, only out of the admin dropdown.
 *
 * Dry-run by default; pass `--apply` to write. Every row it touches is printed in full first and
 * written to a JSON backup beside the script output, so the change can be reversed by hand.
 *
 *   npm --prefix functions run fix:relative-timing            # report only
 *   npm --prefix functions run fix:relative-timing -- --apply # write
 */
export {};

async function main() {
  const { db } = await import('../firebase');
  const apply = process.argv.includes('--apply');

  const snapshot = await db.collection('contextRows').where('timingType', '==', 'relative').get();
  if (snapshot.empty) {
    console.log('No context row uses relative timing. Nothing to do.');
    return;
  }

  console.log(`${snapshot.size} row(s) stored as relative:\n`);
  const backup = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  for (const row of backup)
    console.log(
      `  ${row.id}  stack=${(row as { stackId?: string }).stackId}  ` +
        `"${(row as { microActionTitle?: { en?: string } }).microActionTitle?.en}"  ` +
        `relativeTo=${(row as { relativeToContextId?: string }).relativeToContextId}`,
    );

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write these changes:');
    console.log('  timingType        relative -> none');
    console.log('  relativeToContextId  <id>  -> null');
    console.log('  dependencyText     <text>  -> empty (it only described the dependency)');
    return;
  }

  const { writeFileSync } = await import('node:fs');
  const path = `relative-timing-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written to ${path}`);

  const batch = db.batch();
  for (const document of snapshot.docs)
    batch.update(document.ref, {
      timingType: 'none',
      relativeToContextId: null,
      // The dependency sentence describes a relationship that no longer exists; leaving it would
      // put orphaned copy in front of a member.
      dependencyText: { nl: '', en: '' },
    });
  await batch.commit();
  console.log(`Updated ${snapshot.size} row(s) to timingType "none".`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
