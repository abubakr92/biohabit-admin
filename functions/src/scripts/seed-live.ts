export {};
async function main() {
  if (process.env.CONFIRM_LIVE_SEED !== 'biohabit') throw new Error('Set CONFIRM_LIVE_SEED=biohabit to confirm the live seed.');
  const [{ db }, seed] = await Promise.all([import('../firebase'), import('../seed-data')]);
  const now = new Date().toISOString();
  const planned: Array<{ path: string; id: string; data: Record<string, unknown> }> = [];
  seed.labels.forEach((label, index) => planned.push({ path: 'labels', id: `label-${index + 1}`, data: { ...label } }));
  seed.actions.forEach((action, index) => planned.push({ path: 'microActions', id: `action-${index + 1}`, data: { ...action } }));
  seed.stacks.forEach((stack, index) => {
    planned.push({ path: 'stacks', id: `stack-${index + 1}`, data: { ...stack, createdAt: new Date(2026, 0, index + 2).toISOString(), updatedAt: now } });
    seed.contextRows(index).forEach((row, rowIndex) => planned.push({ path: 'contextRows', id: `context-${index + 1}-${rowIndex + 1}`, data: { ...row, stackId: `stack-${index + 1}` } }));
  });

  // Create-only: a document that already exists may carry editor changes, and a merge would silently revert them.
  const references = planned.map((item) => db.collection(item.path).doc(item.id));
  const snapshots = await db.getAll(...references);
  const missing = planned.filter((_item, index) => !snapshots[index].exists);
  if (!missing.length) { console.log(`All ${planned.length} seed documents already exist. Nothing written.`); return; }
  const batch = db.batch();
  missing.forEach((item) => batch.set(db.collection(item.path).doc(item.id), item.data));
  await batch.commit();
  console.log(`Created ${missing.length} missing seed documents; left ${planned.length - missing.length} existing documents untouched.`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
