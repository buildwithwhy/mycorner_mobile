// Fixture test for the outreach-prep path (npm run test:outreach).
// Runs the real CLI as a subprocess against a temp copy of the data tree with
// --fixtures (bundled Place Details responses, no network) and asserts:
//   - records land in the queue with status 'draft' and honest contact blocks
//   - missing contact info is flagged, never guessed
//   - emailFound is always null
//   - the no-send invariant: no email/sending dependency or code path exists.

import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const CLI = join(REPO_ROOT, 'scripts', 'outreach-prep.ts');

// Packages that would mean the repo can send email — none may ever appear.
const SEND_PACKAGE_PATTERN =
  /nodemailer|sendgrid|mailgun|postmark|aws-sdk|emailjs|smtp|resend|mandrill|sparkpost/i;
// Identifiers in our own scripts that would mean a send path was introduced.
const SEND_CODE_PATTERN =
  /nodemailer|sendgrid|mailgun|postmark|smtp|emailjs|\.sendMail\(|transporter|sendEmail|sendEmailPitch/i;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const APPROVED_PROPOSAL = {
  proposedSpot: {
    name: "Perly's Cafe",
    googlePlaceId: 'ChIJfixture-denied',
    address: '12 Test Street, London',
    lat: 51.4815,
    lng: -0.0583,
    category: 'cafe',
    rationale: 'High local rating, category under-represented here',
  },
  evidence: {
    insideNeighborhood: '1',
    checkedAt: '2026-11-02T08:00:00Z',
    placesStatus: 'OK',
  },
  status: 'approved',
};

const PROPOSED_PROPOSAL = {
  ...APPROVED_PROPOSAL,
  status: 'proposed',
};

function spotSource(overrides: Record<string, string | undefined>): string {
  const fields = [
    "    id: 'curated-1-1',",
    "    neighborhoodId: '1',",
    `    name: '${overrides.name ?? 'Fixture Roasters'}',`,
    `    category: '${overrides.category ?? 'cafe'}',`,
    "    description: 'Fixture spot description',",
    "    address: '1 Fixture Street',",
    "    location: { lat: 51.5, lng: -0.1 },",
    "    source: 'curated',",
    overrides.editorial ? `    editorial: '${overrides.editorial}',` : undefined,
    overrides.placeId ? `    placeId: '${overrides.placeId}',` : undefined,
  ];
  return `import type { LocalSpot } from '../../src/types';

export const londonCuratedSpots: LocalSpot[] = [
  {
${fields.filter(Boolean).join('\n')}
  },
];
`;
}

async function makeSandbox(): Promise<{
  root: string;
  queueRoot: string;
  dataRoot: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'outreach-fixture-'));
  const queueRoot = join(root, 'review-queue');
  const dataRoot = join(root, 'src', 'data');
  await mkdir(join(queueRoot, 'spot-proposals'), { recursive: true });
  await mkdir(join(dataRoot, 'curatedSpots'), { recursive: true });
  await mkdir(join(dataRoot, 'neighborhoods'), { recursive: true });

  const typesPath = relative(dataRoot, join(REPO_ROOT, 'src', 'types'));
  await writeFile(
    join(dataRoot, 'curatedSpots', 'london.ts'),
    // Full contact, missing contact, and no placeId — one spot per flag path.
    spotSource({ placeId: 'ChIJfixture0001', editorial: 'The fixture neighborhood favorite.' }),
  );
  await writeFile(
    join(dataRoot, 'curatedSpots', 'new-york.ts'),
    `import type { LocalSpot } from '${typesPath}';

export const newYorkCuratedSpots: LocalSpot[] = [
  {
    id: 'curated-ny-1-1',
    neighborhoodId: 'ny-1',
    name: 'Missing Contact Spot',
    category: 'shop',
    description: 'Fixture spot with no Places contact fields',
    location: { lat: 40.7, lng: -74.0 },
    source: 'curated',
    placeId: 'ChIJfixture0002',
  },
  {
    id: 'curated-ny-1-2',
    neighborhoodId: 'ny-1',
    name: 'No PlaceId Spot',
    category: 'park',
    description: 'Fixture spot without a placeId',
    location: { lat: 40.71, lng: -74.01 },
    source: 'curated',
  },
];
`,
  );
  await writeFile(
    join(dataRoot, 'neighborhoods', 'london.ts'),
    `export const londonNeighborhoods = [
  {
    id: '1',
    cityId: 'london',
    name: 'Testerville',
  },
];
`,
  );
  await writeFile(
    join(dataRoot, 'neighborhoods', 'new-york.ts'),
    `export const newYorkNeighborhoods = [
  {
    id: 'ny-1',
    cityId: 'new-york',
    name: 'Fixture Heights',
  },
];
`,
  );

  await writeFile(
    join(queueRoot, 'spot-proposals', 'perlys-cafe.json'),
    `${JSON.stringify(APPROVED_PROPOSAL, null, 2)}\n`,
  );
  await writeFile(
    join(queueRoot, 'spot-proposals', 'not-approved.json'),
    `${JSON.stringify(PROPOSED_PROPOSAL, null, 2)}\n`,
  );

  return { root, queueRoot, dataRoot };
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function runCli(sandbox: { queueRoot: string; dataRoot: string }, extraArgs: string[]): {
  status: number;
  stdout: string;
} {
  const proc = spawnSync(
    'bun',
    [
      CLI,
      '--fixtures',
      `--out=${sandbox.queueRoot}`,
      `--data-root=${sandbox.dataRoot}`,
      ...extraArgs,
    ],
    { encoding: 'utf8' },
  );
  return { status: proc.status ?? -1, stdout: proc.stdout ?? '' };
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

const runDate = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const sandbox = await makeSandbox();
const result = runCli(sandbox, []);

await check('fixture run exits 0 and writes draft records into the queue', async () => {
  assert.equal(result.status, 0, `exit ${result.status}: ${result.stdout}`);
  const dir = join(sandbox.queueRoot, 'outreach', runDate);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'summary.json');
  assert.equal(files.length, 4, `expected 4 records, got ${files.join(', ')}`);
  for (const file of files) {
    const record = JSON.parse(await readFile(join(dir, file), 'utf8'));
    assert.equal(record.status, 'draft', `${file}: status must be draft`);
    assert.equal(record.contact.emailFound, null, `${file}: emailFound must stay null`);
    assert.ok(record.draftPitch.startsWith('Subject:'), `${file}: pitch must start with Subject:`);
  }
});

await check('enriched spot carries verbatim phone/website and no flag', async () => {
  const path = join(sandbox.queueRoot, 'outreach', runDate, 'fixture-roasters.json');
  const record = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(record.contact.phone, '+44 20 7946 0001');
  assert.equal(record.contact.website, 'https://fixture-one.example.com');
  assert.equal(record.flag, undefined);
  assert.ok(record.draftPitch.includes('Testerville'), 'pitch must name the neighborhood');
  assert.ok(
    record.draftPitch.includes('The fixture neighborhood favorite.'),
    'pitch must reuse the human-written editorial line',
  );
});

await check('OK response with no contact fields is flagged missing-contact, not guessed', async () => {
  const path = join(sandbox.queueRoot, 'outreach', runDate, 'missing-contact-spot.json');
  const record = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(record.contact.phone, null);
  assert.equal(record.contact.website, null);
  assert.equal(record.flag, 'missing-contact');
});

await check('spot without a placeId is flagged no-place-id — no enrichment attempted', async () => {
  const path = join(sandbox.queueRoot, 'outreach', runDate, 'no-placeid-spot.json');
  const record = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(record.contact.phone, null);
  assert.equal(record.contact.website, null);
  assert.equal(record.contact.emailFound, null);
  assert.equal(record.flag, 'no-place-id');
});

await check(
  'approved proposal becomes a target; failed enrichment is flagged, not fabricated',
  async () => {
    const path = join(sandbox.queueRoot, 'outreach', runDate, 'perly-s-cafe.json');
    const record = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(record.spotId, 'perly-s-cafe');
    assert.equal(record.contact.phone, null);
    assert.equal(record.flag, 'enrichment-failed'); // fixture returns REQUEST_DENIED
  },
);

await check('non-approved proposals never become targets', async () => {
  const dir = join(sandbox.queueRoot, 'outreach', runDate);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'summary.json');
  const pitchless = files.filter((f) => f.includes('not-approved'));
  assert.equal(pitchless.length, 0, 'proposed record must not produce an outreach record');
});

await check('run summary is written beside the records', async () => {
  const summary = JSON.parse(
    await readFile(join(sandbox.queueRoot, 'outreach', runDate, 'summary.json'), 'utf8'),
  );
  assert.equal(summary.kind, 'outreach');
  assert.equal(summary.counts.written, 4);
  assert.equal(summary.recordsWritten.length, 4);
  assert.ok(
    summary.notes.some((n: string) => n.includes('never sent by any code path')),
    'summary must state the no-send invariant',
  );
});

await check('no-send invariant: no email/sending dependency anywhere in package.json', async () => {
  const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8'));
  const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.ok(!SEND_PACKAGE_PATTERN.test(deps), `sending dependency present: ${deps}`);
});

await check('no-send invariant: no send path in the outreach code', async () => {
  for (const file of ['scripts/outreach-prep.ts', 'scripts/queue/outreach-core.ts']) {
    const source = await readFile(join(REPO_ROOT, file), 'utf8');
    assert.ok(!SEND_CODE_PATTERN.test(source), `${file}: sending identifier present`);
  }
});

await check('fixture runs refuse to write into the real review-queue', async () => {
  const proc = spawnSync('bun', [CLI, '--fixtures'], { encoding: 'utf8' });
  assert.equal(proc.status, 2, '--fixtures without --out must exit 2');
});

await rm(sandbox.root, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) process.exit(1);
