/**
 * Compares the repo's `firestore.rules` with the ruleset actually live on the project.
 *
 * The rules are owned and deployed by the mobile lead, not by this repo. The file here is a
 * verbatim mirror kept only so the security-rules tests run against what production really
 * enforces — it is deliberately never deployed from here, which is why `npm run firebase:deploy`
 * carries `--only functions:api` and nothing else.
 *
 * Run this after the lead changes the rules, then re-run the rules tests:
 *   npm --prefix functions run check-rules            # report drift
 *   npm --prefix functions run check-rules -- --pull  # overwrite the mirror from production
 */
export {};

async function main() {
  const { GoogleAuth } = await import('google-auth-library');
  const { readFileSync, writeFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const get = async <T>(url: string) => (await client.request<T>({ url })).data;

  const releases = await get<{ releases: Array<{ name: string; rulesetName: string; updateTime: string }> }>(
    'https://firebaserules.googleapis.com/v1/projects/biohabit/releases',
  );
  const release =
    releases.releases.find((item) => item.name.endsWith('/cloud.firestore')) ?? releases.releases[0];
  const ruleset = await get<{ source: { files: Array<{ content: string }> } }>(
    `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
  );

  const live = ruleset.source.files.map((file) => file.content).join('\n');
  const file = resolve(__dirname, '../../../firestore.rules');
  const local = readFileSync(file, 'utf8');
  const normalise = (value: string) => value.replace(/\r\n/g, '\n').trim();

  console.log(`live ruleset : ${release.rulesetName.split('/').pop()}`);
  console.log(`deployed at  : ${release.updateTime}`);

  if (normalise(live) === normalise(local)) {
    console.log('\nIn sync. The mirror matches what the project enforces.');
    return;
  }

  console.log(`\nDRIFT: the mirror is ${normalise(local).length} bytes, production is ${normalise(live).length}.`);
  const liveLines = new Set(normalise(live).split('\n').map((line) => line.trim()));
  const localLines = new Set(normalise(local).split('\n').map((line) => line.trim()));
  const onlyLive = [...liveLines].filter((line) => line && !localLines.has(line));
  const onlyLocal = [...localLines].filter((line) => line && !liveLines.has(line));
  for (const line of onlyLive.slice(0, 20)) console.log(`  + live only : ${line}`);
  for (const line of onlyLocal.slice(0, 20)) console.log(`  - mirror only: ${line}`);

  if (!process.argv.includes('--pull')) {
    console.log('\nRe-run with --pull to refresh the mirror, then re-run the rules tests.');
    process.exitCode = 1;
    return;
  }
  writeFileSync(file, normalise(live) + '\n');
  console.log('\nMirror refreshed from production.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
