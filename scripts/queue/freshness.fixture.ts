// Fixture test for the freshness auditor (npm run test:auditor).
// Runs the real CLI as a subprocess in dry-run mode against a temp queue root
// and a temp events dir, with canned Places responses keyed by real spot ids,
// and asserts the audit invariant: a deliberately planted permanently-closed
// spot and a stale event are both caught, drift and not-found verdicts queue,
// and ok / unverifiable subjects write nothing.

import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const CLI = join(REPO_ROOT, 'scripts', 'freshness-auditor.ts');

// Real curated spots (Shoreditch) whose bundled coordinates the fixtures rely on.
const SPOTS = {
  'curated-1-1': { lat: 51.5249, lng: -0.0768 }, // Dishoom Shoreditch
  'curated-1-2': { lat: 51.5235, lng: -0.0764 }, // Boxpark Shoreditch
  'curated-1-3': { lat: 51.5219, lng: -0.0718 }, // Brick Lane
  'curated-1-4': { lat: 51.5245, lng: -0.0727 }, // Allpress Espresso
  'curated-1-5': { lat: 51.5237, lng: -0.0735 }, // Brat
  'curated-1-6': { lat: 51.5242, lng: -0.0772 }, // Smoking Goat
};

const FIXTURES = {
  // Planted permanently-closed spot: confident name match, CLOSED_PERMANENTLY.
  'curated-1-1': {
    status: 'OK',
    candidates: [
      {
        name: 'Dishoom Shoreditch',
        formattedAddress: '7 Boundary Street, London E2 7JE',
        businessStatus: 'CLOSED_PERMANENTLY',
        lat: SPOTS['curated-1-1'].lat,
        lng: SPOTS['curated-1-1'].lng,
      },
    ],
  },
  // Name drift: same location, the listing is now only "Boxpark".
  'curated-1-2': {
    status: 'OK',
    candidates: [
      {
        name: 'Boxpark',
        formattedAddress: '2-10 Bethnal Green Road, London E1 6GY',
        businessStatus: 'OPERATIONAL',
        lat: SPOTS['curated-1-2'].lat,
        lng: SPOTS['curated-1-2'].lng,
      },
    ],
  },
  // Address drift: exact name match, but a different city entirely.
  'curated-1-3': {
    status: 'OK',
    candidates: [
      {
        name: 'Brick Lane',
        formattedAddress: 'Brick Lane, London E1 6RF',
        businessStatus: 'OPERATIONAL',
        lat: 53.4808,
        lng: -2.2426,
      },
    ],
  },
  // Vanished listing.
  'curated-1-4': { status: 'ZERO_RESULTS', candidates: [] },
  // Healthy spot: exact name and location — must NOT be queued.
  'curated-1-5': {
    status: 'OK',
    candidates: [
      {
        name: 'Brat',
        formattedAddress: '4 Redchurch Street, London E1 6JL',
        businessStatus: 'OPERATIONAL',
        lat: SPOTS['curated-1-5'].lat,
        lng: SPOTS['curated-1-5'].lng,
      },
    ],
  },
  // Billing off: REQUEST_DENIED is an API problem, not a data exception.
  'curated-1-6': { status: 'REQUEST_DENIED', candidates: [] },
};

// Planted events: one stale (verifiedAt far past the 90-day window) and one
// fresh (verified today). Plain objects — no imports, so the temp file is
// self-contained under the dynamic import the CLI uses.
const STALE_EVENT = {
  id: 'evt-stale-1',
  neighborhoodId: '1',
  title: 'Planted Stale Market',
  category: 'market',
  description: 'An event verified long ago — the auditor must catch it.',
  venue: 'Test Square',
  schedule: { kind: 'recurring', pattern: 'Every Sunday' },
  source: 'editorial',
  verifiedAt: '2025-01-01T00:00:00Z',
};
const FRESH_EVENT = {
  id: 'evt-fresh-1',
  neighborhoodId: '1',
  title: 'Planted Fresh Market',
  category: 'market',
  description: 'Verified moments ago — must stay below the radar.',
  venue: 'Test Square',
  schedule: { kind: 'recurring', pattern: 'Every Saturday' },
  source: 'editorial',
  verifiedAt: new Date().toISOString(),
};

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const tmp = await mkdtemp(join(tmpdir(), 'freshness-auditor-'));
  try {
    const queueRoot = join(tmp, 'review-queue');
    const eventsDir = join(tmp, 'events');
    await mkdir(eventsDir, { recursive: true });
    await writeJson(join(tmp, 'fixtures.json'), FIXTURES);
    await writeFile(
      join(eventsDir, 'planted-events.ts'),
      `// Fixture events (untyped plain objects by design — see test).\nexport const plantedEvents = ${JSON.stringify([STALE_EVENT, FRESH_EVENT], null, 2)};\n`,
      'utf8',
    );

    const result = spawnSync(
      'bun',
      [
        CLI,
        '--fixtures=' + join(tmp, 'fixtures.json'),
        '--queue-root=' + queueRoot,
        '--events-dir=' + eventsDir,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000 },
    );
    assert.equal(result.status, 0, `CLI exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

    // Locate the run directory (named by the run date).
    const runDirs = (await readdir(join(queueRoot, 'freshness'))).sort();
    assert.equal(runDirs.length, 1, `expected exactly one run directory, got ${runDirs.join(', ')}`);
    const runDir = join(queueRoot, 'freshness', runDirs[0]);
    const files = (await readdir(runDir)).filter((f) => f.endsWith('.json') && f !== 'summary.json').sort();

    // Exactly the planted exceptions queue — nothing for ok / unverifiable /
    // fresh subjects.
    assert.deepEqual(
      files,
      [
        'curated-1-1-spot-closed.json',
        'curated-1-2-spot-name-drift.json',
        'curated-1-3-spot-address-drift.json',
        'curated-1-4-spot-not-found.json',
        'evt-stale-1-event-stale.json',
      ],
      `unexpected queue contents:\n${files.join('\n')}`,
    );

    // Every record validates and carries the right kind + subject.
    const { validateFreshnessRecord } = (await import(
      join(REPO_ROOT, 'scripts', 'queue', 'records.ts')
    )) as { validateFreshnessRecord: (raw: unknown) => { valid: boolean; errors: string[] } };

    for (const file of files) {
      const raw = JSON.parse(await readFile(join(runDir, file), 'utf8')) as unknown;
      const validation = validateFreshnessRecord(raw);
      assert.ok(validation.valid, `${file} failed validation: ${validation.errors.join('; ')}`);
    }

    const closed = JSON.parse(await readFile(join(runDir, 'curated-1-1-spot-closed.json'), 'utf8')) as Record<string, unknown>;
    assert.equal(closed.kind, 'spot-closed');
    assert.equal(closed.status, 'open');
    const evidence = closed.evidence as Record<string, unknown>;
    assert.equal(evidence.businessStatus, 'CLOSED_PERMANENTLY');
    assert.equal(evidence.placesStatus, 'OK');

    const stale = JSON.parse(await readFile(join(runDir, 'evt-stale-1-event-stale.json'), 'utf8')) as Record<string, unknown>;
    assert.equal(stale.kind, 'event-stale');
    assert.equal((stale.evidence as Record<string, unknown>).placesStatus, 'LOCAL');

    const summary = JSON.parse(await readFile(join(runDir, 'summary.json'), 'utf8')) as {
      dryRun: boolean;
      counts: { total: number; written: number; errors: number };
      recordsWritten: string[];
    };
    assert.equal(summary.dryRun, true);
    assert.equal(summary.counts.errors, 0);
    assert.equal(summary.counts.written, files.length, 'summary counts.written must match record files');
    assert.equal(summary.recordsWritten.length, files.length);

    console.log(`\n✅ fixture test passed — run dir: ${runDir}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

await main();
