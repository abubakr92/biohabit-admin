/**
 * Composition rows whose stored action title no longer matches the micro-action's current title
 * (a rename made before the panel carried renames to rows). Catalogue content only.
 *
 *   npm --prefix functions run check-row-titles              # dry run: lists them, writes nothing
 *   npm --prefix functions run check-row-titles -- --apply   # copies the current title onto those rows
 *
 * --apply changes live catalogue data: run it only with the PM's written approval.
 */
import { db } from '../firebase';

type Bilingual = { en?: string; nl?: string };

async function main() {
  const apply = process.argv.includes('--apply');
  const [stacks, rows, actions] = await Promise.all(['stacks', 'contextRows', 'microActions'].map((name) => db.collection(name).get()));
  const stackTitle = new Map(stacks.docs.map((stack) => [stack.id, String(stack.get('title.en') ?? stack.id)]));
  const actionTitle = new Map(actions.docs.map((action) => [action.id, action.get('title') as Bilingual | undefined]));
  const stale = rows.docs.filter((row) => {
    const current = actionTitle.get(String(row.get('microActionId')));
    const stored = row.get('microActionTitle') as Bilingual | undefined;
    return current && (current.en !== stored?.en || current.nl !== stored?.nl);
  });
  for (const row of stale) {
    const stored = row.get('microActionTitle') as Bilingual | undefined;
    const current = actionTitle.get(String(row.get('microActionId')))!;
    console.log(`${stackTitle.get(String(row.get('stackId')))}: row shows "${stored?.en}" / "${stored?.nl}", action is now "${current.en}" / "${current.nl}"`);
  }
  if (apply && stale.length) {
    const batch = db.batch();
    stale.forEach((row) => batch.update(row.ref, { microActionTitle: actionTitle.get(String(row.get('microActionId'))) }));
    await batch.commit();
  }
  console.log(`${stale.length} of ${rows.size} rows out of date${apply ? `, ${stale.length} updated` : ' (dry run, nothing written)'}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
