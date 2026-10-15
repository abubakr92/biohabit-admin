/**
 * C1 — the three default anchors the Build 8 open items confirm, and only those:
 *
 *   Evening Wind-Down   Bed − 90 min
 *   Skin & Collagen     First meal, at the moment
 *   Glucose Glide       Second meal, at the moment
 *
 * Each goes on the stack's own daypart, its single segment. No other stack is given an anchor:
 * the document confirms none, and there is no structured timing elsewhere to carry over.
 *
 * Additive: it writes the new `defaultAnchors` field and nothing else, and skips any stack that
 * already has an anchor for that segment, so an editor's choice in the panel is never overwritten.
 *
 *   npm --prefix functions run set:confirmed-anchors            # report only
 *   npm --prefix functions run set:confirmed-anchors -- --apply # write
 */
import type { MomentKey } from '../types';
export {};

const CONFIRMED: Array<{ title: string; moment: MomentKey; offsetMin: number }> = [
  { title: 'Evening Wind-Down', moment: 'bed', offsetMin: -90 },
  { title: 'Skin & Collagen', moment: 'firstMeal', offsetMin: 0 },
  { title: 'Glucose Glide', moment: 'secondMeal', offsetMin: 0 },
];

async function main() {
  const { db } = await import('../firebase');
  const apply = process.argv.includes('--apply');
  const stacks = await db.collection('stacks').get();
  const writes: Array<{ ref: FirebaseFirestore.DocumentReference; daypart: string; anchors: Record<string, unknown> }> = [];

  for (const confirmed of CONFIRMED) {
    const matches = stacks.docs.filter((document) => document.get('title.en') === confirmed.title);
    if (matches.length !== 1) {
      console.log(`  ${confirmed.title}: ${matches.length} stacks carry this title — skipped, check by hand.`);
      continue;
    }
    const [stack] = matches;
    const daypart = stack.get('daypart') as string | null;
    const existing = (stack.get('defaultAnchors') ?? {}) as Record<string, unknown>;
    if (!daypart) {
      console.log(`  ${confirmed.title} (${stack.id}): no daypart, so no segment to anchor — skipped.`);
      continue;
    }
    if (existing[daypart]) {
      console.log(`  ${confirmed.title} (${stack.id}): ${daypart} already anchored ${JSON.stringify(existing[daypart])} — left alone.`);
      continue;
    }
    const anchor = { moment: confirmed.moment, offsetMin: confirmed.offsetMin, fixedTime: null };
    console.log(`  ${confirmed.title} (${stack.id}): ${daypart} -> ${JSON.stringify(anchor)}`);
    writes.push({ ref: stack.ref, daypart, anchors: { ...existing, [daypart]: anchor } });
  }

  if (!writes.length) return console.log('\nNothing to write.');
  if (!apply) return console.log(`\nDry run. Re-run with --apply to write ${writes.length} anchor(s).`);
  const batch = db.batch();
  for (const write of writes) batch.update(write.ref, { defaultAnchors: write.anchors });
  await batch.commit();
  console.log(`\nWrote ${writes.length} anchor(s). No other field was touched.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
