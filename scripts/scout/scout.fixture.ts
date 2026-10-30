// Fixture test for the discovery scout (npm run test:scout).
// Zero network: the pure pipeline runs against an injected stub Places client,
// and the CLI is exercised as a subprocess in --dry-run (fixture client) into
// a temp output dir. Asserts the full logic chain end-to-end:
//
//   category gaps (half-city-median rule, median-0 categories skipped)
//   → polygon filtering (only in-ring candidates survive)
//   → dedupe (curated placeId, curated name+proximity, cross-neighborhood)
//   → ranking + per-neighborhood quota
//   → record shapes (validateSpotProposal) + evidence blocks
//   → queue layout (dry-run reports in spot-proposals-dry-run/, real queue untouched)
//   → determinism (identical dry-run output across runs)

import { strict as assert } from 'node:assert';
import { readdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  categoryCounts,
  cityCategoryMedians,
  findCuratedDuplicate,
  haversineMeters,
  isValidRing,
  normalizePlaceName,
  pointInRing,
  ringRadiusMeters,
  runScout,
  selectUnderRepresentedCategories,
  zeroCategoryCounts,
  type PlacesClient,
  type NearbySearchRequest,
  type ScoutPlace,
} from './scout-core';
import { validateSpotProposal } from '../queue/records';
import { runDateString } from '../queue/batch-io';
import type { LocalSpot, SpotCategory } from '../../src/types';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

// ---------------------------------------------------------------------------
// Synthetic city: 8 neighborhoods on a diagonal; only '3' and '6' have gaps.
// ---------------------------------------------------------------------------

const HALF = 0.0005; // square ring half-width in degrees (~55m)

function square(centerLat: number, centerLng: number): { latitude: number; longitude: number }[] {
  return [
    { latitude: centerLat + HALF, longitude: centerLng - HALF },
    { latitude: centerLat + HALF, longitude: centerLng + HALF },
    { latitude: centerLat - HALF, longitude: centerLng + HALF },
    { latitude: centerLat - HALF, longitude: centerLng - HALF },
    { latitude: centerLat + HALF, longitude: centerLng - HALF }, // closing repeat
  ];
}

function centroidOf(index: number): { lat: number; lng: number } {
  return { lat: 51.5 - 0.02 * (index - 1), lng: -0.1 - 0.02 * (index - 1) };
}

function spot(id: string, neighborhoodId: string, name: string, category: SpotCategory, at: { lat: number; lng: number }, placeId?: string): LocalSpot {
  return { id, neighborhoodId, name, category, location: at, source: 'curated', ...(placeId ? { placeId } : {}) };
}

function spotsFor(index: number): LocalSpot[] {
  const c = centroidOf(index);
  switch (index) {
    case 1:
      return [
        spot('s-1a', '1', 'Alpha Cafe One', 'cafe', { lat: c.lat + 0.0001, lng: c.lng }),
        spot('s-1b', '1', 'Alpha Cafe Two', 'cafe', { lat: c.lat, lng: c.lng + 0.0001 }),
        spot('s-1c', '1', 'Alpha Cafe Three', 'cafe', { lat: c.lat - 0.0001, lng: c.lng }),
        spot('s-1d', '1', 'Alpha Cafe Four', 'cafe', { lat: c.lat, lng: c.lng - 0.0001 }),
        spot('s-1e', '1', 'Alpha Restaurant One', 'restaurant', { lat: c.lat + 0.0002, lng: c.lng }),
        spot('s-1f', '1', 'Alpha Restaurant Two', 'restaurant', { lat: c.lat, lng: c.lng + 0.0002 }),
        spot('s-1g', '1', 'Alpha Restaurant Three', 'restaurant', { lat: c.lat - 0.0002, lng: c.lng }),
        spot('s-1h', '1', 'Alpha Restaurant Four', 'restaurant', { lat: c.lat, lng: c.lng - 0.0002 }),
      ];
    case 2:
      return [
        spot('s-2a', '2', 'Beta Cafe One', 'cafe', { lat: c.lat + 0.0001, lng: c.lng }),
        spot('s-2b', '2', 'Beta Cafe Two', 'cafe', { lat: c.lat, lng: c.lng + 0.0001 }),
        spot('s-2c', '2', 'Beta Restaurant One', 'restaurant', { lat: c.lat - 0.0001, lng: c.lng }),
        spot('s-2d', '2', 'Beta Restaurant Two', 'restaurant', { lat: c.lat, lng: c.lng - 0.0001 }),
        spot('s-2e', '2', 'Beta Museum', 'museum', { lat: c.lat + 0.0002, lng: c.lng + 0.0002 }),
      ];
    case 3:
      // Zero cafes (a gap), two restaurants — and the two dedupe probes live
      // here: one with a placeId, one that only matches by name+proximity.
      return [
        spot('s-3a', '3', 'Existing Place With Id', 'restaurant', { lat: c.lat + 0.0001, lng: c.lng + 0.0001 }, 'ChIJcurated-1'),
        spot('s-3b', '3', 'Existing Cafe Two', 'restaurant', { lat: c.lat + 0.00012, lng: c.lng + 0.00012 }),
      ];
    case 4:
      return [
        spot('s-4a', '4', 'Delta Cafe One', 'cafe', { lat: c.lat, lng: c.lng }),
        spot('s-4b', '4', 'Delta Cafe Two', 'cafe', { lat: c.lat + 0.0001, lng: c.lng }),
        spot('s-4c', '4', 'Delta Cafe Three', 'cafe', { lat: c.lat, lng: c.lng + 0.0001 }),
        spot('s-4d', '4', 'Delta Restaurant One', 'restaurant', { lat: c.lat - 0.0001, lng: c.lng }),
        spot('s-4e', '4', 'Delta Restaurant Two', 'restaurant', { lat: c.lat, lng: c.lng - 0.0001 }),
        spot('s-4f', '4', 'Delta Restaurant Three', 'restaurant', { lat: c.lat - 0.0002, lng: c.lng }),
      ];
    case 5:
      return [
        spot('s-5a', '5', 'Epsilon Cafe One', 'cafe', { lat: c.lat, lng: c.lng }),
        spot('s-5b', '5', 'Epsilon Restaurant One', 'restaurant', { lat: c.lat + 0.0001, lng: c.lng }),
      ];
    case 6:
      return []; // gaps on both cafe and restaurant
    default:
      return [];
  }
}

const NEIGHBORHOOD_COUNT = 8;
const neighborhoods = Array.from({ length: NEIGHBORHOOD_COUNT }, (_, i) => {
  const index = i + 1;
  const c = centroidOf(index);
  return {
    neighborhood: { id: String(index), cityId: 'london', name: `Test Hood ${index}` },
    ring: index === 7 ? [] : index === 8 ? undefined : square(c.lat, c.lng),
    spots: spotsFor(index),
  };
});

const curatedSpots = neighborhoods.flatMap((n) => n.spots);

// ---------------------------------------------------------------------------
// Stub Places client — query-aware, deterministic, records every call.
// ---------------------------------------------------------------------------

const calls: Array<{ request: NearbySearchRequest }> = [];

function titleCase(type: string): string {
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function stubPlace(placeId: string, name: string, lat: number, lng: number, primaryType: string, rating?: number, ratingCount?: number): ScoutPlace {
  return { placeId, name, address: `Fixture Address for ${name}`, lat, lng, primaryType, ...(rating !== undefined ? { rating } : {}), ...(ratingCount !== undefined ? { ratingCount } : {}) };
}

const stubClient: PlacesClient = {
  name: 'stub',
  async searchNearby(request: NearbySearchRequest): Promise<ScoutPlace[]> {
    calls.push({ request });
    const type = request.includedTypes[0] ?? 'cafe';
    const label = titleCase(type);
    const isCafeQuery = type === 'cafe';
    const results: ScoutPlace[] = [
      // Emitted by the first searching neighborhood, deduped for the second.
      stubPlace('ChIJshared-1', 'Shared Duplicate Spot', request.lat, request.lng, 'cafe', 4.0, 55),
      // Genuine candidate near the centroid.
      stubPlace(`ChIJinside-${type}`, `Genuine New ${label}`, request.lat + 0.0002, request.lng + 0.0002, type, 4.6, 310),
      // Outside the searching polygon (ring half-width is 0.0005).
      stubPlace(`ChIJmid-${type}`, `Mid Distance ${label}`, request.lat + 0.003, request.lng + 0.003, type, 4.9, 1200),
      stubPlace(`ChIJfar-${type}`, `Far Away ${label}`, request.lat + 0.05, request.lng + 0.05, type, 4.8, 800),
    ];
    if (isCafeQuery) {
      // Curated dedupe probes — only meaningful inside neighborhood 3's ring.
      results.push(
        stubPlace('ChIJcurated-1', 'Different Name Same Place', request.lat + 0.00005, request.lng + 0.00005, 'cafe', 4.3, 120),
        stubPlace('ChIJnameprobe', 'Existing Cafe Two', centroidOf(3).lat + 0.00016, centroidOf(3).lng + 0.00016, 'cafe', 4.1, 60),
      );
    }
    return results;
  },
};

const CHECKED_AT = '2026-10-30T00:00:00Z';

// ---------------------------------------------------------------------------
// Unit checks: geometry, naming, medians, gap selection
// ---------------------------------------------------------------------------

const ring3 = square(centroidOf(3).lat, centroidOf(3).lng);
assert.ok(isValidRing(ring3), 'closed square ring is valid');
assert.ok(pointInRing(centroidOf(3), ring3), 'centroid sits inside its ring');
assert.ok(pointInRing({ lat: centroidOf(3).lat + 0.0002, lng: centroidOf(3).lng + 0.0002 }, ring3), 'genuine candidate offset stays inside');
assert.ok(!pointInRing({ lat: centroidOf(3).lat + 0.003, lng: centroidOf(3).lng + 0.003 }, ring3), 'mid offset is outside');
assert.ok(!isValidRing([]), 'empty ring is invalid');

const oneDegreeLat = haversineMeters({ lat: 51.5, lng: 0 }, { lat: 52.5, lng: 0 });
assert.ok(oneDegreeLat > 110_000 && oneDegreeLat < 112_000, `one degree of latitude is ~111km (got ${oneDegreeLat})`);
assert.strictEqual(normalizePlaceName('  Café Bloom! '), 'cafebloom', 'normalization strips case, diacritics, punctuation');
assert.ok(ringRadiusMeters(ring3, centroidOf(3)) > 50, 'ring radius covers the polygon');

const medians = cityCategoryMedians(neighborhoods.map((n) => n.spots));
// cafe counts per nb: [4,2,0,3,1,0,0,0] → median 0.5 → target ceil(0.25) = 1
// restaurant counts: [4,2,2,3,1,0,0,0] → median 1.5 → target 1
// museum counts: [0,1,0,0,0,0,0,0] → median 0 → skipped (city-level question)
assert.strictEqual(medians.cafe, 0.5, `cafe median (got ${medians.cafe})`);
assert.strictEqual(medians.restaurant, 1.5, `restaurant median (got ${medians.restaurant})`);
assert.strictEqual(medians.museum, 0, 'museum median is zero city-wide');

const gaps3 = selectUnderRepresentedCategories(categoryCounts(spotsFor(3)), medians, 2);
assert.deepStrictEqual(gaps3.map((g) => g.category), ['cafe'], 'neighborhood 3 gaps: cafe only (deficit tie with restaurant? restaurant count is 2 → no gap)');
const gaps6 = selectUnderRepresentedCategories(categoryCounts(spotsFor(6)), medians, 2);
assert.deepStrictEqual(gaps6.map((g) => g.category), ['cafe', 'restaurant'], 'neighborhood 6 gaps: both, alphabetical tiebreak');
const noGapCounts = zeroCategoryCounts();
noGapCounts.cafe = 1;
noGapCounts.restaurant = 1;
assert.deepStrictEqual(selectUnderRepresentedCategories(noGapCounts, medians, 2), [], 'a neighborhood at target in every citywide category has no gaps');

// ---------------------------------------------------------------------------
// End-to-end pipeline with the stub client
// ---------------------------------------------------------------------------

const output = await runScout({
  neighborhoods,
  curatedSpots,
  client: stubClient,
  options: {
    maxPerNeighborhood: 2,
    categoriesPerNeighborhood: 2,
    checkedAt: CHECKED_AT,
    placesStatus: 'OK',
    maxRequests: 400,
  },
});

const byStatus = (status: string) => output.outcomes.filter((o) => o.status === status);
assert.deepStrictEqual(
  output.outcomes.filter((o) => ['1', '2', '4', '5'].includes(o.neighborhoodId)).map((o) => o.status),
  ['no-gaps', 'no-gaps', 'no-gaps', 'no-gaps'],
  'well-stocked neighborhoods produce no searches',
);
assert.strictEqual(byStatus('invalid-boundary').length, 1, 'neighborhood 7 has an invalid ring');
assert.strictEqual(byStatus('no-boundary').length, 1, 'neighborhood 8 has no ring');
assert.strictEqual(output.requestsUsed, 3, `three searches total (got ${output.requestsUsed})`);
assert.strictEqual(calls.length, 3, 'stub received exactly the searched queries');
assert.strictEqual(calls[0].request.includedTypes[0], 'cafe', 'neighborhood 3 searches cafe first');
assert.ok(
  Math.abs(calls[0].request.lat - centroidOf(3).lat) < 1e-9,
  'search centered on neighborhood 3 centroid',
);

assert.strictEqual(output.records.length, 3, `three records (got ${output.records.length})`);
assert.ok(output.records.every((r) => validateSpotProposal(r).valid), 'every record passes the queue validator');

// Polygon filter: nothing proposed outside its neighborhood's ring.
for (const record of output.records) {
  const index = Number(record.evidence.insideNeighborhood);
  const ring = square(centroidOf(index).lat, centroidOf(index).lng);
  assert.ok(
    pointInRing({ lat: record.proposedSpot.lat, lng: record.proposedSpot.lng }, ring),
    `record '${record.proposedSpot.name}' sits inside neighborhood ${index}'s polygon`,
  );
}
assert.ok(!output.records.some((r) => r.proposedSpot.name.includes('Far Away')), 'far results are polygon-filtered');
assert.ok(!output.records.some((r) => r.proposedSpot.name.includes('Mid Distance')), 'mid results are polygon-filtered');

// Dedupe: curated placeId, curated name+proximity, cross-neighborhood.
assert.strictEqual(
  output.records.filter((r) => r.proposedSpot.googlePlaceId === 'ChIJshared-1').length,
  1,
  'the shared place is proposed exactly once across neighborhoods',
);
assert.ok(!output.records.some((r) => r.proposedSpot.googlePlaceId === 'ChIJcurated-1'), 'curated placeId duplicate is refused');
assert.ok(!output.records.some((r) => r.proposedSpot.name === 'Existing Cafe Two'), 'curated name+proximity duplicate is refused');
assert.ok(!output.records.some((r) => r.proposedSpot.name === 'Different Name Same Place'), 'placeId match catches renamed dupes');

// Ranking + quota: neighborhood 3 keeps the highest ratingCount first.
const nb3 = output.records.filter((r) => r.evidence.insideNeighborhood === '3');
assert.strictEqual(nb3.length, 2, 'neighborhood 3 fills its quota of 2');
assert.strictEqual(nb3[0].proposedSpot.name, 'Genuine New Cafe', 'ranked by ratingCount descending');
assert.strictEqual(nb3[1].proposedSpot.googlePlaceId, 'ChIJshared-1');
assert.strictEqual(nb3[0].evidence.ratingCount, 310);
assert.strictEqual(nb3[0].evidence.rating, 4.6);
assert.strictEqual(nb3[0].evidence.checkedAt, CHECKED_AT);
assert.strictEqual(nb3[0].evidence.placesStatus, 'OK');
assert.strictEqual(nb3[0].status, 'proposed');
assert.ok(nb3[0].proposedSpot.rationale.includes('cafe is under-represented in Test Hood 3'), 'rationale names the category gap');
assert.ok(nb3[0].proposedSpot.rationale.includes('0 here vs city median of 0.5'), 'rationale carries the numbers');

// Neighborhood 6: its cafe result is the same real place as neighborhood 3's
// (same placeId) → deduped; the restaurant result is new → proposed.
const nb6 = output.records.filter((r) => r.evidence.insideNeighborhood === '6');
assert.strictEqual(nb6.length, 1, 'neighborhood 6 proposes only the new restaurant');
assert.strictEqual(nb6[0].proposedSpot.name, 'Genuine New Restaurant');
assert.strictEqual(nb6[0].proposedSpot.category, 'restaurant');

// Dedupe helpers directly.
const curated = spotsFor(3);
assert.strictEqual(findCuratedDuplicate(stubPlace('ChIJcurated-1', 'Totally Different Name', 0, 0, 'cafe'), curated)?.reason, 'placeId');
assert.strictEqual(
  findCuratedDuplicate(stubPlace('ChIJother', 'Existing Cafe Two', centroidOf(3).lat + 0.00012, centroidOf(3).lng + 0.00012, 'cafe'), curated)?.reason,
  'name-nearby',
);
assert.strictEqual(
  findCuratedDuplicate(stubPlace('ChIJother', 'Existing Cafe Two', centroidOf(6).lat, centroidOf(6).lng, 'cafe'), curated),
  undefined,
  'same name far away is not a duplicate',
);

// ---------------------------------------------------------------------------
// CLI end-to-end: dry-run against the REAL bundled data, into a temp dir
// ---------------------------------------------------------------------------

const realQueueBefore = await readdir(join(REPO_ROOT, 'review-queue', 'spot-proposals')).catch(() => []);

const tmp = await mkdtemp(join(tmpdir(), 'scout-fixture-'));
const run = spawnSync('bun', ['scripts/run-scout.ts', '--dry-run', '--city=london', `--out=${tmp}`], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
assert.strictEqual(run.status, 0, `dry-run CLI exits 0 (stderr: ${run.stderr})`);

const runDate = runDateString();
const reportDir = join(tmp, 'spot-proposals-dry-run', runDate);
const files = (await readdir(reportDir)).filter((f) => f.endsWith('.json') && f !== 'summary.json');
assert.ok(files.length > 0, 'dry-run wrote record files');
assert.ok(files.every((f) => f.endsWith('.json')), 'one file per record');

const summary = JSON.parse(await readFile(join(reportDir, 'summary.json'), 'utf8'));
assert.strictEqual(summary.dryRun, true, 'summary marks the run as dry-run');
assert.strictEqual(summary.counts.total, files.length, 'summary total matches record files');
assert.strictEqual(summary.counts.errors, 0, 'no errors in dry-run');
assert.ok(summary.notes.some((n: string) => n.includes('DRY RUN')), 'summary notes the mode');

for (const file of files) {
  const record = JSON.parse(await readFile(join(reportDir, file), 'utf8'));
  const validation = validateSpotProposal(record);
  assert.ok(validation.valid, `dry-run record ${file} is valid: ${validation.errors.join('; ')}`);
  assert.strictEqual(record.evidence.placesStatus, 'FIXTURE', 'dry-run records carry placesStatus FIXTURE');
  assert.strictEqual(record.status, 'proposed', 'dry-run records start proposed');
}

// The real, promotable queue must be untouched by a dry-run.
const realQueueAfter = await readdir(join(REPO_ROOT, 'review-queue', 'spot-proposals')).catch(() => []);
assert.deepStrictEqual(realQueueAfter, realQueueBefore, 'dry-run leaves review-queue/spot-proposals untouched');

// Determinism: a second identical run produces an identical file set.
const tmp2 = await mkdtemp(join(tmpdir(), 'scout-fixture-'));
const run2 = spawnSync('bun', ['scripts/run-scout.ts', '--dry-run', '--city=london', `--out=${tmp2}`], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
assert.strictEqual(run2.status, 0, 'second dry-run exits 0');
const files2 = (await readdir(join(tmp2, 'spot-proposals-dry-run', runDate))).filter((f) => f !== 'summary.json');
assert.deepStrictEqual(
  files2.sort(),
  [...files].sort(),
  'dry-run output is deterministic across runs',
);
// Content determinism: same-named record files are byte-identical (checkedAt
// is stamped from the run date in dry-run, not the wall clock).
const recordA = await readFile(join(reportDir, files[0]), 'utf8');
const recordB = await readFile(join(tmp2, 'spot-proposals-dry-run', runDate, files[0]), 'utf8');
assert.strictEqual(recordB, recordA, 'dry-run record content is deterministic');

await rm(tmp, { recursive: true, force: true });
await rm(tmp2, { recursive: true, force: true });

console.log('scout.fixture: all assertions passed');
console.log(`  - pipeline: ${output.records.length} records, ${output.requestsUsed} requests, outcomes ${JSON.stringify(output.outcomes.map((o) => o.status))}`);
console.log(`  - CLI dry-run (real data, london): ${files.length} records in ${reportDir}`);
