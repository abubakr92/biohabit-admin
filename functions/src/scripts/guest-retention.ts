/**
 * Build 1, guest data retention: the same run the daily `guestRetention` function makes, from a
 * terminal. Prints counts and dates only, never an account.
 *
 * Deleting cannot be undone, so it counts by default. `--apply` needs the PM's written approval.
 *
 *   npm --prefix functions run guest-retention            # dry run: counts only
 *   npm --prefix functions run guest-retention -- --apply # delete
 */
export {};

async function main() {
  const { runGuestRetention } = await import('../retention');
  console.log(JSON.stringify(await runGuestRetention({ apply: process.argv.includes('--apply') }), null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
