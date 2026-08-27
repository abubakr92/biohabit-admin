export {};
// Fills in the `daypart` added alongside the label and function classification axes, inferring it
// from the suggestedTiming copy where that is unambiguous and reporting anything it cannot.
//
// It deliberately does NOT touch `level`. An earlier version remapped level values onto mode names;
// that is now wrong. Level is difficulty — beginner | intermediate | advanced | expert — and the
// stored values are already correct, so running that mapping today would destroy good data.
//
// Idempotent: stacks that already carry a daypart are skipped. Supports DRY_RUN=true.
const DAYPART_HINTS: Array<[RegExp, string]> = [
  [/waking|ochtend|opstaan|morning|breakfast|ontbijt/i, 'morning'],
  [/midday|middag|noon|lunch/i, 'midday'],
  [/evening|avond|night|nacht|bedtime|slapen/i, 'evening'],
];

function inferDaypart(stack: Record<string, unknown>): string | null {
  const timing = stack.suggestedTiming as { nl?: string; en?: string } | undefined;
  const text = `${timing?.en ?? ''} ${timing?.nl ?? ''}`;
  for (const [pattern, daypart] of DAYPART_HINTS) if (pattern.test(text)) return daypart;
  return null;
}

async function main() {
  if (process.env.CONFIRM_MIGRATION !== 'biohabit')
    throw new Error('Set CONFIRM_MIGRATION=biohabit to confirm this writes to live content.');
  const dryRun = process.env.DRY_RUN === 'true';
  const { db } = await import('../firebase');
  const batch = db.batch();
  let writes = 0;
  const unresolved: string[] = [];

  const snapshot = await db.collection('stacks').get();
  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.daypart !== undefined) continue;
    const daypart = inferDaypart(data);
    if (!daypart)
      unresolved.push(`stacks/${document.id}: no daypart could be inferred — an editor must pick one`);
    batch.update(document.ref, { daypart });
    writes += 1;
    console.log(`  stacks/${document.id} -> ${JSON.stringify({ daypart })}`);
  }

  if (!writes) {
    console.log('Nothing to migrate; every stack already carries a daypart.');
    return;
  }
  if (dryRun)
    console.log(`\nDRY RUN — ${writes} stack(s) would change. Re-run without DRY_RUN=true to apply.`);
  else {
    await batch.commit();
    console.log(`\nMigrated ${writes} stack(s).`);
  }
  if (unresolved.length) {
    console.log('\nNeeds attention:');
    unresolved.forEach((line) => console.log(`  ${line}`));
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
