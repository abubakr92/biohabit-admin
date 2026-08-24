export {};
// Migrates live content to the classification introduced alongside the daypart axis:
//   level:  beginner -> essential, intermediate -> balanced, advanced -> full
//   stacks: gain a `daypart`, inferred from the suggestedTiming copy where it is unambiguous
//
// Both changes are required by the deployed schema, so run this in the same window as the function
// deploy. Idempotent: documents already carrying a new value are left alone and reported as such.
const LEVELS: Record<string, string> = { beginner: 'essential', intermediate: 'balanced', advanced: 'full' };
const NEW_LEVELS = new Set(Object.values(LEVELS));
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
  if (process.env.CONFIRM_MIGRATION !== 'biohabit') throw new Error('Set CONFIRM_MIGRATION=biohabit to confirm this rewrites live content.');
  const dryRun = process.env.DRY_RUN === 'true';
  const { db } = await import('../firebase');
  const batch = db.batch();
  let writes = 0;
  const unresolved: string[] = [];

  for (const collection of ['stacks', 'microActions']) {
    const snapshot = await db.collection(collection).get();
    for (const document of snapshot.docs) {
      const data = document.data();
      const update: Record<string, unknown> = {};

      const level = data.level as string | undefined;
      if (level && LEVELS[level]) update.level = LEVELS[level];
      else if (level && !NEW_LEVELS.has(level)) unresolved.push(`${collection}/${document.id}: unknown level "${level}"`);

      if (collection === 'stacks' && data.daypart === undefined) {
        const daypart = inferDaypart(data);
        update.daypart = daypart;
        if (!daypart) unresolved.push(`${collection}/${document.id}: daypart left null, timing text gave no hint — an editor must pick one before publishing`);
      }

      if (Object.keys(update).length) { batch.update(document.ref, update); writes += 1; console.log(`  ${collection}/${document.id} -> ${JSON.stringify(update)}`); }
    }
  }

  if (!writes) { console.log('Nothing to migrate; live content already matches the new classification.'); return; }
  if (dryRun) { console.log(`\nDRY RUN — ${writes} document(s) would change. Re-run without DRY_RUN=true to apply.`); }
  else { await batch.commit(); console.log(`\nMigrated ${writes} document(s).`); }
  if (unresolved.length) { console.log('\nNeeds attention:'); unresolved.forEach((line) => console.log(`  ${line}`)); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
