// Fixture test for the spot-promotion path (npm run test:queue).
// Runs the real CLI as a subprocess against a temp copy of the data tree and
// asserts the promotion invariant: an approved record with valid evidence
// promotes; a proposed record, a record missing googlePlaceId, a bad Places
// status, an unknown neighborhood, and a duplicate are all refused.

import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const CLI = join(REPO_ROOT, 'scripts', 'promote-spot.ts');
const RUN_DATE = '2026-11-02';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const APPROVED_RECORD = {
  proposedSpot: {
    name: "Perly's Cafe",
    googlePlaceId: 'ChIJfixture0001',
    address: '12 Test Street, London',
    lat: 51.4815,
    lng: -0.0583,
    category: 'cafe',
    rationale: 'High local rating, category under-represented here',
  },
  evidence: {
    ratingCount: 412,
    rating: 4.7,
    insideNeighborhood: '1',
    checkedAt: '2026-11-02T08:00:00Z',
    placesStatus: 'OK',
  },
  status: 'approved',
};

function recordWith(overrides: {
  proposedSpot?: Partial<typeof APPROVED_RECORD.proposedSpot>;
  evidence?: Partial<typeof APPROVED_RECORD.evidence>;
  status?: string;
}): Record<string, unknown> {
  return {
    ...APPROVED_RECORD,
    proposedSpot: { ...APPROVED_RECORD.proposedSpot, ...overrides.proposedSpot },
    evidence: { ...APPROVED_RECORD.evidence, ...overrides.evidence },
    status: overrides.status ?? APPROVED_RECORD.status,
  };
}

/** Minimal dataset file with the real shape (import is type-only, erased at runtime). */
function datasetSource(typesPath: string, id: string): string {
  return `import type { LocalSpot } from '${typesPath}';

export const spots: LocalSpot[] = [
  {
    id: 'curated-${id}-1',
    neighborhoodId: '${id}',
    name: 'Existing Spot',
    category: 'cafe',
    address: '1 Existing Street',
    location: { lat: 51.5, lng: -0.1 },
    source: 'curated',
    placeId: 'ChIJexisting',
  },
];
`;
}

interface Sandbox {
  root: string;
  queueRoot: string;
  dataRoot: string;
  londonFile: string;
  newYorkFile: string;
}

async function makeSandbox(scenario: Record<string, Record<string, unknown>>): Promise<Sandbox> {
  const root = await mkdtemp(join(tmpdir(), 'promote-fixture-'));
  const queueRoot = join(root, 'review-queue');
  const dataRoot = join(root, 'src', 'data');
  await mkdir(join(queueRoot, 'spot-proposals', RUN_DATE), { recursive: true });
  await mkdir(join(dataRoot, 'curatedSpots'), { recursive: true });

  const typesPath = relative(dataRoot, join(REPO_ROOT, 'src', 'types'));
  const londonFile = join(dataRoot, 'curatedSpots', 'london.ts');
  const newYorkFile = join(dataRoot, 'curatedSpots', 'new-york.ts');
  await mkdir(join(dataRoot, 'neighborhoods'), { recursive: true });
  await writeFile(londonFile, datasetSource(typesPath, '1'));
  await writeFile(newYorkFile, datasetSource(typesPath, 'ny-1'));
  await writeFile(
    join(dataRoot, 'neighborhoods', 'london.ts'),
    `export const londonNeighborhoods = [\n  { id: '1', cityId: 'london', name: 'Fixture' },\n];\n`,
  );
  await writeFile(
    join(dataRoot, 'neighborhoods', 'new-york.ts'),
    `export const newYorkNeighborhoods = [\n  { id: 'ny-1', cityId: 'new-york', name: 'Fixture' },\n];\n`,
  );

  for (const [name, record] of Object.entries(scenario)) {
    await writeFile(
      join(queueRoot, 'spot-proposals', RUN_DATE, `${name}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
    );
  }
  return { root, queueRoot, dataRoot, londonFile, newYorkFile };
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

interface CliResult {
  status: number;
  stdout: string;
}

function runCli(sandbox: Sandbox, extraArgs: string[] = []): CliResult {
  const proc = spawnSync(
    'bun',
    [CLI, `--queue-root=${sandbox.queueRoot}`, `--data-root=${sandbox.dataRoot}`, ...extraArgs],
    { encoding: 'utf8' },
  );
  return { status: proc.status ?? -1, stdout: proc.stdout ?? '' };
}

async function readText(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

let passed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`FAIL ${name}: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

await check('approved record promotes (exit 0, entry appended with provenance)', async () => {
  const sandbox = await makeSandbox({ 'perlys-cafe': APPROVED_RECORD });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 0, `exit ${result.status}: ${result.stdout}`);
    const source = await readText(sandbox.londonFile);
    assert.ok(source.includes("id: 'curated-promoted-perly-s-cafe'"), 'entry id missing');
    assert.ok(source.includes("placeId: 'ChIJfixture0001'"), 'placeId missing');
    assert.ok(source.includes('rating: 4.7'), 'rating from evidence missing');
    assert.ok(
      source.includes('// Promoted from review-queue/spot-proposals record'),
      'provenance comment missing',
    );
    assert.ok(
      source.includes('checkedAt 2026-11-02T08:00:00Z'),
      'evidence checkedAt missing from provenance',
    );
    assert.ok(
      source.indexOf('curated-promoted-perlys-cafe') < source.lastIndexOf('];'),
      'entry landed outside the array',
    );

    // The modified file must still parse as a module, with the spot appended.
    const module_ = (await import(sandbox.londonFile)) as {
      spots: Array<{ id: string; placeId?: string }>;
    };
    assert.equal(module_.spots.length, 2);
    assert.equal(module_.spots[1].id, 'curated-promoted-perly-s-cafe');
    assert.equal(module_.spots[1].placeId, 'ChIJfixture0001');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('proposed record is refused (NOT_APPROVED, dataset untouched)', async () => {
  const sandbox = await makeSandbox({ 'perlys-cafe': recordWith({ status: 'proposed' }) });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 1, 'proposed record must not promote');
    assert.ok(result.stdout.includes('NOT_APPROVED'), 'refusal reason missing from output');
    const source = await readText(sandbox.londonFile);
    assert.ok(!source.includes('curated-promoted'), 'dataset was modified despite refusal');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('record missing googlePlaceId is refused (MISSING_GOOGLE_PLACE_ID)', async () => {
  const sandbox = await makeSandbox({
    'no-place-id': recordWith({ proposedSpot: { googlePlaceId: '' } }),
  });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 1, 'record without placeId must not promote');
    assert.ok(result.stdout.includes('MISSING_GOOGLE_PLACE_ID'), 'refusal reason missing from output');
    const source = await readText(sandbox.londonFile);
    assert.ok(!source.includes('curated-promoted'), 'dataset was modified despite refusal');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('record with placesStatus REQUEST_DENIED is refused (PLACES_STATUS_NOT_OK)', async () => {
  const sandbox = await makeSandbox({
    'bad-status': recordWith({ evidence: { placesStatus: 'REQUEST_DENIED' } }),
  });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 1, 'non-OK Places status must not promote');
    assert.ok(result.stdout.includes('PLACES_STATUS_NOT_OK'), 'refusal reason missing from output');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('record with unknown neighborhood is refused (UNKNOWN_NEIGHBORHOOD)', async () => {
  const sandbox = await makeSandbox({
    'unknown-hood': recordWith({ evidence: { insideNeighborhood: 'does-not-exist' } }),
  });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 1, 'unknown neighborhood must not promote');
    assert.ok(result.stdout.includes('UNKNOWN_NEIGHBORHOOD'), 'refusal reason missing from output');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('duplicate placeId refused (DUPLICATE_SPOT) while the NY record promotes', async () => {
  const sandbox = await makeSandbox({
    dupe: recordWith({ proposedSpot: { googlePlaceId: 'ChIJexisting' } }),
    'ny-spot': recordWith({ evidence: { insideNeighborhood: 'ny-1' } }),
  });
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 1, 'duplicate must not promote');
    assert.ok(result.stdout.includes('DUPLICATE_SPOT'), 'refusal reason missing from output');
    assert.ok(result.stdout.includes('PROMOTED'), 'the NY record should have promoted');
    const nySource = await readText(sandbox.newYorkFile);
    assert.ok(nySource.includes("neighborhoodId: 'ny-1'"), 'NY dataset not updated');
    const londonSource = await readText(sandbox.londonFile);
    assert.ok(!londonSource.includes('curated-promoted'), 'duplicate landed in london.ts');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('dry run reports the decision without writing', async () => {
  const sandbox = await makeSandbox({ 'perlys-cafe': APPROVED_RECORD });
  try {
    const result = runCli(sandbox, ['--dry-run']);
    assert.ok(result.stdout.includes('PROMOTED'), 'dry run should report the decision');
    assert.ok(result.stdout.includes('dry run'), 'dry-run banner missing');
    const source = await readText(sandbox.londonFile);
    assert.ok(!source.includes('curated-promoted'), 'dry run wrote to the dataset');
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

await check('empty queue exits 0 with no records found', async () => {
  const sandbox = await makeSandbox({});
  try {
    const result = runCli(sandbox);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('No spot-proposal records found'));
  } finally {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED: ${failure}`);
  process.exit(1);
}
