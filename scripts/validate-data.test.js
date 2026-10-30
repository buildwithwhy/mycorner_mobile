/*
 * Fixture-based unit tests for scripts/validate-data.js — pure parsers and
 * checks only (no file I/O). Run: npm test  (node --test scripts/)
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  splitArrayRecords,
  stringField,
  parseNeighborhoodRecords,
  parseSpotRecords,
  parsePromptNames,
  parseCoordinateMap,
  parseBoundaryMap,
  parseImageMap,
  ringDefect,
  runChecks,
  CHECKS,
} = require('./validate-data.js');

// --- fixtures: the exact record shape used by every src/data file ------------

const NB_SOURCE = `import { Foo } from './index';

export const nb: Neighborhood[] = [
  {
    id: '1',
    cityId: 'london',
    name: 'Shoreditch',
    highlights: ['a', 'b'],
  },
  {
    id: '2',
    cityId: 'london',
    name: 'King\\'s Cross',
    parentId: '60',
    highlights: ['a \\'b'],
  },
];
`;

const SPOT_SOURCE = `import type { LocalSpot } from '../../types';

export const spots: LocalSpot[] = [
  {
    id: 'curated-1-1',
    neighborhoodId: '1',
    name: 'Dishoom',
    location: { lat: 51.5249, lng: -0.0768 },
  },
  {
    id: 'curated-1-2',
    neighborhoodId: 'ny-99',
    name: 'Story Coffee Wimbledon',
  },
];
`;

// --- parsers -----------------------------------------------------------------

test('splitArrayRecords splits two-space-indented records', () => {
  const records = splitArrayRecords(NB_SOURCE);
  assert.equal(records.length, 2);
  assert.match(records[0], /Shoreditch/);
});

test('stringField reads values and unescapes quotes', () => {
  const record = splitArrayRecords(NB_SOURCE)[1];
  assert.equal(stringField(record, 'name'), "King's Cross");
  assert.equal(stringField(record, 'parentId'), '60');
  assert.equal(stringField(record, 'missing'), undefined);
});

test('stringField reads double-quoted values (apostrophe in name)', () => {
  const record = splitArrayRecords(`export const nb = [\n  {\n    id: "34",\n    cityId: "london",\n    name: "St John's Wood",\n  },\n];\n`)[0];
  assert.equal(stringField(record, 'name'), "St John's Wood");
  assert.equal(stringField(record, 'id'), '34');
});

test('parseNeighborhoodRecords extracts id, name, parentId', () => {
  const nbs = parseNeighborhoodRecords(NB_SOURCE);
  assert.deepEqual(nbs.map((n) => n.id), ['1', '2']);
  assert.equal(nbs[1].parentId, '60');
  assert.equal(nbs[0].parentId, undefined);
});

test('parseSpotRecords extracts id, neighborhoodId, name, placeId', () => {
  const spots = parseSpotRecords(SPOT_SOURCE);
  assert.deepEqual(spots.map((s) => s.id), ['curated-1-1', 'curated-1-2']);
  assert.equal(spots[1].neighborhoodId, 'ny-99');
  assert.equal(spots[1].name, 'Story Coffee Wimbledon');
  assert.equal(spots[0].placeId, undefined);
});

test('parseCoordinateMap reads Record<string, {latitude, longitude}>', () => {
  const src = `export const c = {
  '1': { latitude: 51.5270, longitude: -0.0726 }, // Shoreditch
  'ny-1': { latitude: 40.78, longitude: -73.97 },
};`;
  const map = parseCoordinateMap(src);
  assert.deepEqual(map['1'], { latitude: 51.527, longitude: -0.0726 });
  assert.deepEqual(map['ny-1'], { latitude: 40.78, longitude: -73.97 });
});

test('parseBoundaryMap reads polygons and ignores non-array entries', () => {
  const src = `export const b = {
  '1': [
    { latitude: 51.52, longitude: -0.09 },
    { latitude: 51.51, longitude: -0.07 },
    { latitude: 51.53, longitude: -0.06 },
    { latitude: 51.52, longitude: -0.09 },
  ],
  '2': [
    { latitude: 51.60, longitude: -0.10 },
    { latitude: 51.61, longitude: -0.11 },
    { latitude: 51.62, longitude: -0.12 },
  ],
};`;
  const map = parseBoundaryMap(src);
  assert.equal(map['1'].length, 4);
  assert.equal(map['2'].length, 3);
});

test('parseImageMap reads double-quoted id -> name entries', () => {
  const src = `export const neighborhoodImageMap: Record<string, string> = {
  "1": "shoreditch",
  "ny-1": "upper-west-side",
};`;
  assert.deepEqual(parseImageMap(src), { '1': 'shoreditch', 'ny-1': 'upper-west-side' });
});

// --- parsePromptNames ---------------------------------------------------------

const PROMPTS_SOURCE = `NEIGHBORHOOD IMAGE GENERATION PROMPTS
=====================================
LONDON NEIGHBORHOODS (2)
=====================================

--- 1. Shoreditch ---
Highlights: Tech hub, Street art

Style sentence. Scene one.

--- 2. Chelsea ---
Highlights: King's Road

Style sentence. Scene two.

=====================================
NEW YORK NEIGHBORHOODS (1)
=====================================

--- 41. Chelsea ---
Highlights: Art galleries

Style sentence. Scene three.

=====================================
END OF PROMPTS
=====================================
`;

test('parsePromptNames scopes names by city section', () => {
  const { byCity, declared } = parsePromptNames(PROMPTS_SOURCE);
  assert.deepEqual([...byCity.london].sort(), ['Chelsea', 'Shoreditch']);
  assert.deepEqual([...byCity['new-york']], ['Chelsea']);
  assert.deepEqual(declared, { london: 2, 'new-york': 1 });
});

test('parsePromptNames stops collecting at END OF PROMPTS', () => {
  const src = `LONDON NEIGHBORHOODS (1)
--- 1. Real ---
=====================================
END OF PROMPTS
--- 2. Fake ---
`;
  const { byCity } = parsePromptNames(src);
  assert.deepEqual([...byCity.london], ['Real']);
});

// --- ringDefect --------------------------------------------------------------

const closed = (pts) => [...pts, pts[0]];
const triangle = [
  { latitude: 1, longitude: 1 },
  { latitude: 2, longitude: 2 },
  { latitude: 3, longitude: 1 },
];

test('ringDefect: closed ring with >= 3 unique vertices passes', () => {
  assert.equal(ringDefect(closed(triangle)), null);
});

test('ringDefect: open ring fails', () => {
  assert.match(ringDefect(triangle), /not a closed ring/);
});

test('ringDefect: closed but degenerate (fewer than 3 unique) fails', () => {
  const degenerate = closed([
    { latitude: 1, longitude: 1 },
    { latitude: 1, longitude: 1 },
  ]);
  assert.match(ringDefect(degenerate), /fewer than 3 unique vertices/);
  assert.match(ringDefect(closed([triangle[0], triangle[0], triangle[1]])), /fewer than 3 unique vertices/);
});

// --- runChecks ---------------------------------------------------------------

const BASE_NB = (id, { parentId } = {}) => ({ id, name: `NB ${id}`, parentId });
const GOOD_CTX = {
  neighborhoods: [BASE_NB('1'), BASE_NB('2', { parentId: '1' })],
  spots: [
    { id: 's1', neighborhoodId: '1', name: 'Spot One', placeId: 'ChIJ1' },
    { id: 's2', neighborhoodId: '2', name: 'Spot Two', placeId: 'ChIJ2' },
  ],
  coordinates: new Map([
    ['1', { latitude: 51.5, longitude: -0.07 }],
    ['2', { latitude: 51.6, longitude: -0.08 }],
  ]),
  boundaries: new Map([
    ['1', closed(triangle)],
    ['2', closed(triangle)],
  ]),
  summaries: new Set(['1']),
  imageNames: new Set(['1', '2']),
};

function byCheck(findings, name) {
  return findings.filter((f) => f.check === name);
}

test('runChecks: clean context yields no error findings', () => {
  const findings = runChecks(GOOD_CTX);
  assert.equal(findings.filter((f) => f.severity === 'error').length, 0);
});

test('runChecks: prompts-coverage reports the missing neighborhood by name and id', () => {
  const ctx = {
    ...GOOD_CTX,
    neighborhoods: [
      { id: '1', name: 'Shoreditch', cityId: 'london' },
      { id: '2', name: 'Missing Vale', cityId: 'london' },
    ],
    promptNames: { byCity: { london: new Set(['Shoreditch']), 'new-york': new Set() }, declared: {} },
  };
  const f = byCheck(runChecks(ctx), 'prompts-coverage');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'error');
  assert.match(f[0].message, /no image prompt for 2 \(Missing Vale\)/);
});

test('runChecks: prompts-coverage is skipped when prompts context is absent', () => {
  assert.equal(byCheck(runChecks(GOOD_CTX), 'prompts-coverage').length, 0);
});

test('runChecks: prompts-coverage flags same-name neighborhoods across cities independently', () => {
  const ctx = {
    ...GOOD_CTX,
    neighborhoods: [
      { id: '1', name: 'Chelsea', cityId: 'london' },
      { id: 'ny-6', name: 'Chelsea', cityId: 'new-york' },
    ],
    promptNames: {
      byCity: { london: new Set(), 'new-york': new Set(['Chelsea']) },
      declared: {},
    },
  };
  const f = byCheck(runChecks(ctx), 'prompts-coverage');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /no image prompt for 1/);
});

test('runChecks: prompts-coverage warns when header count does not match entries', () => {
  const ctx = {
    ...GOOD_CTX,
    neighborhoods: [
      { id: '1', name: 'A', cityId: 'london' },
      { id: '2', name: 'B', cityId: 'london', parentId: '1' },
    ],
    promptNames: {
      byCity: { london: new Set(['A', 'B']), 'new-york': new Set() },
      declared: { london: 3, 'new-york': 0 },
    },
  };
  const f = byCheck(runChecks(ctx), 'prompts-coverage');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'warning');
  assert.match(f[0].message, /declares 3 entries but 2 were parsed/);
});

test('runChecks: missing coordinates and boundary name the neighborhood id', () => {
  const findings = runChecks({
    ...GOOD_CTX,
    coordinates: new Map(),
    boundaries: new Map(),
  });
  const messages = findings.map((f) => f.message);
  assert.ok(messages.some((m) => m.includes('missing coordinates for 1')));
  assert.ok(messages.some((m) => m.includes('missing boundary polygon for 1')));
});

test('runChecks: unclosed ring is reported against the neighborhood', () => {
  const findings = runChecks({ ...GOOD_CTX, boundaries: new Map([['1', triangle]]) });
  const f = byCheck(findings, 'boundary-polygon').find((x) => x.severity === 'error');
  assert.ok(f.message.startsWith('invalid boundary for 1'));
});

test('runChecks: parent without summary fails; child without summary does not', () => {
  const findings = runChecks({ ...GOOD_CTX, summaries: new Set() });
  const msgs = byCheck(findings, 'explore-summary-parents').map((f) => f.message);
  assert.equal(msgs.length, 1);
  assert.ok(msgs[0].includes('for parent neighborhood 1'));
});

test('runChecks: neighborhood with no image asset is named', () => {
  const findings = runChecks({ ...GOOD_CTX, imageNames: new Set() });
  const f = byCheck(findings, 'hero-image')[0];
  assert.ok(f.message.includes('no hero image reference for 1'));
});

test('runChecks: spot with unknown neighborhoodId is named', () => {
  const findings = runChecks({
    ...GOOD_CTX,
    spots: [{ id: 's1', neighborhoodId: 'ghost', name: 'Ghost Spot', placeId: 'x' }],
  });
  const f = byCheck(findings, 'spot-neighborhood-resolves')[0];
  assert.ok(f.message.includes("unknown neighborhoodId 'ghost'"));
  assert.equal(f.subject, 's1');
});

test('runChecks: duplicate spot ids are reported', () => {
  const findings = runChecks({
    ...GOOD_CTX,
    spots: [GOOD_CTX.spots[0], { ...GOOD_CTX.spots[0] }],
  });
  assert.ok(byCheck(findings, 'spot-ids-unique').length === 1);
});

test('runChecks: missing placeId is a warning by default, per-spot error under strict', () => {
  const spotMissingPlaceId = { id: 's2', neighborhoodId: '2', name: 'Spot Two' };
  const ctx = { ...GOOD_CTX, spots: [GOOD_CTX.spots[0], spotMissingPlaceId] };

  const warn = runChecks(ctx).filter((f) => f.check === 'spot-place-id');
  assert.equal(warn.length, 1);
  assert.equal(warn[0].severity, 'warning');

  const errs = runChecks(ctx, { strict: true }).filter((f) => f.check === 'spot-place-id');
  assert.equal(errs.length, 1);
  assert.equal(errs[0].severity, 'error');
  assert.equal(errs[0].subject, 's2');
});

test('runChecks: fabricated names from the audit blocklist are errors', () => {
  const findings = runChecks({
    ...GOOD_CTX,
    spots: [{ id: 's1', neighborhoodId: '1', name: 'Story Coffee Wimbledon', placeId: 'x' }],
  });
  const f = byCheck(findings, 'spot-fabricated-name')[0];
  assert.equal(f.severity, 'error');
  assert.equal(f.subject, 's1');
});

test('runChecks: every registry check has fired in at least one test above', () => {
  // Guards the registry: a check added without coverage (or renamed away) surfaces here.
  const fired = new Set([
    ...runChecks(GOOD_CTX),
    ...runChecks({ ...GOOD_CTX, coordinates: new Map(), boundaries: new Map(), summaries: new Set(), imageNames: new Set(), spots: [{ id: 's1', neighborhoodId: 'ghost', name: 'Story Coffee Wimbledon' }], promptNames: { byCity: { london: new Set(), 'new-york': new Set() }, declared: {} } }),
    ...runChecks({ ...GOOD_CTX, spots: [GOOD_CTX.spots[0], { ...GOOD_CTX.spots[0] }] }),
    ...runChecks(GOOD_CTX, { strict: true }),
  ].map((f) => f.check));
  for (const c of CHECKS) {
    assert.ok(fired.has(c.name), `check ${c.name} never fired in tests`);
  }
});
