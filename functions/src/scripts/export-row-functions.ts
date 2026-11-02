/**
 * Build 1, answer 3: one line per composition row with the function in effect and where it comes
 * from, in the order the panel and the app resolve it: row -> micro-action default -> stack.
 * Read-only.
 *
 *   npm --prefix functions run export:row-functions > row-functions.csv
 */
export {};

async function main() {
  const { db } = await import('../firebase');
  const [stacks, rows, actions] = await Promise.all(['stacks', 'contextRows', 'microActions'].map((name) => db.collection(name).get()));
  const actionById = new Map(actions.docs.map((document) => [document.id, document]));
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  console.log('stack,action,function,source');
  for (const stack of [...stacks.docs].sort((a, b) => String(a.get('title.en')).localeCompare(String(b.get('title.en'))))) {
    const stackRows = rows.docs.filter((row) => row.get('stackId') === stack.id).sort((a, b) => a.get('stackSortOrder') - b.get('stackSortOrder'));
    for (const row of stackRows) {
      const rowFunction = row.get('functionTag') as string | null | undefined;
      const actionDefault = actionById.get(row.get('microActionId'))?.get('defaultFunctionTag') as string | null | undefined;
      const [value, source] = rowFunction ? [rowFunction, 'Row'] : actionDefault ? [actionDefault, 'Action default'] : [stack.get('functionTag') as string, 'Stack'];
      console.log([quote(stack.get('title.en')), quote(row.get('microActionTitle.en')), value, source].join(','));
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
