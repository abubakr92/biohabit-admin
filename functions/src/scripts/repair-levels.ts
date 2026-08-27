export {};
// Repairs stacks and micro-actions whose `level` holds a mode name.
//
// For a period the Level dropdown offered essential | balanced | full, so anything saved then had a
// mode name written into a field that means difficulty. This maps those back:
//
//   essential -> beginner    balanced -> intermediate    full -> advanced
//
// Note this is the reverse of an earlier migration, which mapped difficulty onto mode names. That
// one was wrong and has been removed; this undoes its effect where it reached live data.
//
// The mapping is a best guess: nobody chose "balanced" as a difficulty, the dropdown simply offered
// it. Every repaired document is listed so an editor can review it. Supports DRY_RUN=true.
const REPAIR: Record<string, string> = { essential: 'beginner', balanced: 'intermediate', full: 'advanced' };
const VALID = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

async function main() {
  if (process.env.CONFIRM_REPAIR !== 'biohabit')
    throw new Error('Set CONFIRM_REPAIR=biohabit to confirm this writes to live content.');
  const dryRun = process.env.DRY_RUN === 'true';
  const { db } = await import('../firebase');
  const batch = db.batch();
  const repaired: string[] = [];
  const unknown: string[] = [];

  for (const collection of ['stacks', 'microActions']) {
    const snapshot = await db.collection(collection).get();
    for (const document of snapshot.docs) {
      const level = document.get('level') as string | undefined;
      if (!level || VALID.has(level)) continue;
      if (!REPAIR[level]) {
        unknown.push(`${collection}/${document.id}: unrecognised level "${level}" — left alone`);
        continue;
      }
      batch.update(document.ref, { level: REPAIR[level] });
      repaired.push(`${collection}/${document.id}: "${level}" -> "${REPAIR[level]}"`);
    }
  }

  if (!repaired.length) {
    console.log('Nothing to repair; every level already holds a difficulty.');
  } else {
    repaired.forEach((line) => console.log(`  ${line}`));
    if (dryRun) console.log(`\nDRY RUN — ${repaired.length} document(s) would change.`);
    else {
      await batch.commit();
      console.log(`\nRepaired ${repaired.length} document(s).`);
      console.log('These difficulties were inferred, not chosen — worth an editor confirming them.');
    }
  }
  if (unknown.length) {
    console.log('\nNeeds attention:');
    unknown.forEach((line) => console.log(`  ${line}`));
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
