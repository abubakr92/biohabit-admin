/**
 * A3 — optional follow-up, NOT run as part of the checklist.
 *
 * Before this change a context row's daypart was mandatory, so every row was written with an
 * explicit value whether or not it meant anything. 50 of the 52 live rows simply repeat their
 * stack's daypart; only 2 genuinely differ. Now that null means "inherit from the stack", those
 * 50 rows read as deliberate overrides when they are nothing of the kind, which is exactly the
 * distinction the checklist asks the panel to make visible.
 *
 * Clearing a row's daypart where it already equals its stack's changes no behaviour: the effective
 * daypart is identical either way. It only makes the override marker mean something.
 *
 * This is the client's data and the checklist does not ask for it, so it is left as a decision:
 *
 *   npm --prefix functions run fix:row-dayparts            # report only
 *   npm --prefix functions run fix:row-dayparts -- --apply # write
 */
export {};

async function main() {
  const { db } = await import('../firebase');
  const apply = process.argv.includes('--apply');

  const stacks = await db.collection('stacks').get();
  const stackDaypart = new Map(
    stacks.docs.map((document) => [document.id, (document.data().daypart ?? null) as string | null]),
  );

  const rows = await db.collection('contextRows').get();
  const redundant = rows.docs.filter((document) => {
    const data = document.data();
    return data.daypart != null && stackDaypart.get(data.stackId) === data.daypart;
  });
  const genuine = rows.docs.filter((document) => {
    const data = document.data();
    return data.daypart != null && stackDaypart.get(data.stackId) !== data.daypart;
  });

  console.log(`${rows.size} context row(s) total`);
  console.log(`  ${redundant.length} repeat their stack's daypart (would become "inherit")`);
  console.log(`  ${genuine.length} genuinely differ (left untouched)`);
  for (const document of genuine)
    console.log(
      `    keep: ${document.id}  "${document.data().microActionTitle?.en}"  ` +
        `row=${document.data().daypart}  stack=${stackDaypart.get(document.data().stackId)}`,
    );

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to clear the redundant values.');
    return;
  }
  if (!redundant.length) return;

  const { writeFileSync } = await import('node:fs');
  const path = `row-daypart-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      redundant.map((document) => ({ id: document.id, daypart: document.data().daypart })),
      null,
      2,
    ),
  );
  console.log(`\nBackup written to ${path}`);

  // Batched in chunks: a Firestore batch takes at most 500 writes.
  for (let index = 0; index < redundant.length; index += 400) {
    const batch = db.batch();
    for (const document of redundant.slice(index, index + 400))
      batch.update(document.ref, { daypart: null });
    await batch.commit();
  }
  console.log(`Cleared ${redundant.length} redundant row daypart(s) to inherit.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
