#!/usr/bin/env bun
// Discovery scout CLI: proposes new spots per neighborhood polygon into the
// review queue (spec art_H2bNLauv, Stream C — discovery scout).
//
// For each neighborhood: search Places nearby the polygon centroid for
// categories that are under-represented in that neighborhood's curated spots,
// keep only results inside the polygon, dedupe against every existing curated
// spot (and earlier records of the same run), and write one JSON record per
// proposal into review-queue/ — the human-review surface is the queue PR.
//
//   bun scripts/run-scout.ts                          # real run (needs billing)
//   GOOGLE_MAPS_API_KEY=... bun scripts/run-scout.ts --city=london
//   bun scripts/run-scout.ts --dry-run                # fixture client, no network
//   bun scripts/run-scout.ts --neighborhoods=1,2,7 --city=london
//
// Flags:
//   --dry-run                          fixture Places client, zero network, zero
//                                      spend; deterministic output; records land in
//                                      review-queue/spot-proposals-dry-run/ (never
//                                      the promotable queue) with placesStatus
//                                      'FIXTURE'
//   --city=london|new-york|both        scope (default: both)
//   --out=DIR                          queue root (default: review-queue)
//   --max-per-neighborhood=N           proposal quota per neighborhood (default 2)
//   --categories-per-neighborhood=N    gap categories searched per neighborhood (default 2)
//   --rps=N                            live-run request rate (default 2/s)
//   --max-requests=N                   live-run hard request cap (default 400)
//   --neighborhoods=id1,id2            restrict to specific neighborhood ids
//   --no-resume                        live-run: ignore a previous checkpoint and
//                                      restart the run date from scratch
//
// Real runs are rate-limited and resumable: a checkpoint in .scout-cache/
// (gitignored) tracks completed neighborhoods, so an interrupted run continues
// where it stopped. Every record carries an evidence block; promote-spot
// refuses anything without placesStatus 'OK', so only a real Places check can
// ever reach src/data/.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  queueRecordPath,
  runDateString,
  slugify,
  writeQueueRecord,
  writeRunSummary,
  type QueueKind,
} from './queue/batch-io';
import type { SpotProposalRecord } from './queue/records';
import { runScout, type PlacesClient, type ScoutNeighborhoodInput } from './scout/scout-core';
import { createFixturePlacesClient } from './scout/fixture-places';
import { londonNeighborhoods } from '../src/data/neighborhoods/london';
import { newYorkNeighborhoods } from '../src/data/neighborhoods/new-york';
import { londonBoundaries } from '../src/data/boundaries/london';
import { newYorkBoundaries } from '../src/data/boundaries/new-york';
import { londonCuratedSpots } from '../src/data/curatedSpots/london';
import { newYorkCuratedSpots } from '../src/data/curatedSpots/new-york';

type CityScope = 'london' | 'new-york' | 'both';

interface ScoutCliOptions {
  dryRun: boolean;
  city: CityScope;
  out: string;
  maxPerNeighborhood: number;
  categoriesPerNeighborhood: number;
  rps: number;
  maxRequests: number;
  neighborhoodIds: string[] | undefined;
  resume: boolean;
}

function parseArgs(argv: string[]): ScoutCliOptions {
  const options: ScoutCliOptions = {
    dryRun: false,
    city: 'both',
    out: 'review-queue',
    maxPerNeighborhood: 2,
    categoriesPerNeighborhood: 2,
    rps: 2,
    maxRequests: 400,
    neighborhoodIds: undefined,
    resume: true,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-resume') options.resume = false;
    else if (arg.startsWith('--city=')) {
      const value = arg.split('=')[1];
      if (value !== 'london' && value !== 'new-york' && value !== 'both') {
        console.error(`--city must be london | new-york | both (got '${value}')`);
        process.exit(2);
      }
      options.city = value;
    } else if (arg.startsWith('--out=')) options.out = arg.split('=')[1];
    else if (arg.startsWith('--max-per-neighborhood=')) options.maxPerNeighborhood = Number(arg.split('=')[1]);
    else if (arg.startsWith('--categories-per-neighborhood=')) options.categoriesPerNeighborhood = Number(arg.split('=')[1]);
    else if (arg.startsWith('--rps=')) options.rps = Number(arg.split('=')[1]);
    else if (arg.startsWith('--max-requests=')) options.maxRequests = Number(arg.split('=')[1]);
    else if (arg.startsWith('--neighborhoods=')) {
      options.neighborhoodIds = arg.split('=')[1].split(',').map((id) => id.trim()).filter(Boolean);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  for (const [name, value] of [
    ['--max-per-neighborhood', options.maxPerNeighborhood],
    ['--categories-per-neighborhood', options.categoriesPerNeighborhood],
    ['--rps', options.rps],
    ['--max-requests', options.maxRequests],
  ] as const) {
    if (!Number.isInteger(value) || value < 1) {
      console.error(`${name} must be a positive integer (got ${value})`);
      process.exit(2);
    }
  }
  return options;
}

const CITY_IDS = ['london', 'new-york'] as const;
type CityId = (typeof CITY_IDS)[number];

const boundariesByCity: Record<CityId, Record<string, { latitude: number; longitude: number }[]>> = {
  london: londonBoundaries,
  'new-york': newYorkBoundaries,
};

function buildInputs(city: CityId, neighborhoodIds: string[] | undefined): ScoutNeighborhoodInput[] {
  const all = city === 'london' ? londonNeighborhoods : newYorkNeighborhoods;
  const boundaries = boundariesByCity[city];
  if (neighborhoodIds) {
    const unknown = neighborhoodIds.filter((id) => !all.some((n) => n.id === id));
    if (unknown.length > 0) {
      console.error(`Unknown neighborhood id(s) for ${city}: ${unknown.join(', ')}`);
      process.exit(2);
    }
  }
  return all
    .filter((n) => !neighborhoodIds || neighborhoodIds.includes(n.id))
    .map((n) => ({
      neighborhood: { id: n.id, cityId: n.cityId, name: n.name },
      ring: boundaries[n.id],
      spots:
        city === 'london'
          ? londonCuratedSpots.filter((spot) => spot.neighborhoodId === n.id)
          : newYorkCuratedSpots.filter((spot) => spot.neighborhoodId === n.id),
    }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Live-run rate limiting: the delay lives in this wrapper so the pure core
 *  and the fixture client stay deterministic. */
function rateLimited(client: PlacesClient, minIntervalMs: number): PlacesClient {
  let lastRequestAt = 0;
  return {
    name: client.name,
    async searchNearby(request) {
      const wait = lastRequestAt + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      return client.searchNearby(request);
    },
  };
}

interface Checkpoint {
  completedNeighborhoodIds: string[];
}

function checkpointPath(cacheDir: string, scope: string, runDate: string): string {
  return join(cacheDir, `scout-checkpoint-${scope}-${runDate}.json`);
}

async function loadCheckpoint(path: string, enabled: boolean): Promise<Checkpoint> {
  if (!enabled) return { completedNeighborhoodIds: [] };
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as Checkpoint;
    return Array.isArray(raw.completedNeighborhoodIds)
      ? raw
      : { completedNeighborhoodIds: [] };
  } catch {
    return { completedNeighborhoodIds: [] };
  }
}

async function saveCheckpoint(path: string, checkpoint: Checkpoint): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

/** Unique record slugs: <city>-<neighborhood-name>-<place-name>, with a numeric
 *  suffix when two same-named places are proposed for one neighborhood. */
function recordSlugs(
  records: SpotProposalRecord[],
  nameById: Map<string, { city: string; name: string }>,
): string[] {
  const used = new Map<string, number>();
  return records.map((record) => {
    const inside = record.evidence.insideNeighborhood;
    const info = nameById.get(inside);
    const base = slugify(`${info?.city ?? 'unknown'}-${info?.name ?? inside}-${record.proposedSpot.name}`);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

/** Select the Places client for this run. Dry-run uses the deterministic
 *  fixture client; a real run loads the network module lazily and wraps it in
 *  the rate limiter. */
async function createClient(options: ScoutCliOptions): Promise<PlacesClient> {
  if (options.dryRun) return createFixturePlacesClient();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      'GOOGLE_MAPS_API_KEY is not set. Real runs need a server-restricted key with billing enabled.\n' +
        'Until Google Maps billing is restored (owner action, OQ1), use --dry-run: it proves the pipeline with fixtures and no network.',
    );
    process.exit(2);
  }
  const { createGooglePlacesClient } = await import('./scout/places-client');
  return rateLimited(createGooglePlacesClient(apiKey), 1000 / options.rps);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const runDate = runDateString();
  const scope = options.city === 'both' ? CITY_IDS.join('+') : options.city;
  const kind: QueueKind = options.dryRun ? 'spot-proposals-dry-run' : 'spot-proposals';
  const mode = options.dryRun
    ? 'DRY RUN (fixture Places client — no network, no key, no spend)'
    : 'LIVE (real Places requests — requires billing)';

  console.log(`Discovery scout — ${mode}`);
  console.log(`Scope: ${scope} · run date: ${runDate}`);

  const client = await createClient(options);

  const cities: CityId[] = options.city === 'both' ? [...CITY_IDS] : [options.city];
  const neighborhoods = cities.flatMap((city) => buildInputs(city, options.neighborhoodIds));

  const checkpointFile = checkpointPath('.scout-cache', scope, runDate);
  const checkpoint = await loadCheckpoint(checkpointFile, !options.dryRun && options.resume);
  if (checkpoint.completedNeighborhoodIds.length > 0) {
    console.log(`Resuming: skipping ${checkpoint.completedNeighborhoodIds.length} completed neighborhood(s)`);
  }
  const pending = neighborhoods.filter(
    (entry) => !checkpoint.completedNeighborhoodIds.includes(entry.neighborhood.id),
  );

  const allCuratedSpots = [...londonCuratedSpots, ...newYorkCuratedSpots];
  console.log(
    `Neighborhoods: ${pending.length} to process (${neighborhoods.length} in scope) · ` +
      `curated dedupe reference: ${allCuratedSpots.length} spots`,
  );

  const startedAt = new Date().toISOString();
  const output = await runScout({
    neighborhoods: pending,
    curatedSpots: allCuratedSpots,
    client,
    options: {
      maxPerNeighborhood: options.maxPerNeighborhood,
      categoriesPerNeighborhood: options.categoriesPerNeighborhood,
      checkedAt: options.dryRun ? `${runDate}T00:00:00Z` : new Date().toISOString(),
      placesStatus: options.dryRun ? 'FIXTURE' : 'OK',
      maxRequests: options.maxRequests,
    },
  });

  // Write one file per record, then the run summary beside them.
  const nameById = new Map(
    output.outcomes.map((o) => [o.neighborhoodId, { city: o.cityId, name: o.neighborhoodName }] as const),
  );
  const slugs = recordSlugs(output.records, nameById);
  const recordsWritten: string[] = [];
  for (const [index, record] of output.records.entries()) {
    const path = queueRecordPath(options.out, kind, runDate, slugs[index]);
    recordsWritten.push(await writeQueueRecord(path, record));
  }

  const outcomeLines = output.outcomes.map(
    (o) =>
      `${o.cityId}/${o.neighborhoodName}: ${o.status}` +
      (o.proposals > 0 ? ` (${o.proposals} proposal${o.proposals === 1 ? '' : 's'}: ${o.categoriesSearched.join(', ')})` : '') +
      (o.detail ? ` — ${o.detail}` : ''),
  );

  const summaryPath = await writeRunSummary(options.out, kind, runDate, {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    recordsWritten,
    counts: {
      total: output.records.length,
      written: recordsWritten.length,
      errors: output.outcomes.filter((o) => o.status === 'error').length,
    },
    notes: [
      `mode: ${mode}`,
      `client: ${client.name}`,
      `scope: ${scope} · neighborhoods processed: ${output.outcomes.length} · Places requests: ${output.requestsUsed}`,
      ...outcomeLines,
    ],
  });

  for (const line of outcomeLines) console.log(`  ${line}`);
  console.log(`Records written: ${recordsWritten.length} · summary: ${summaryPath}`);

  if (!options.dryRun && options.resume) {
    const completed = output.outcomes
      .filter((o) => o.status !== 'error')
      .map((o) => o.neighborhoodId);
    await saveCheckpoint(checkpointFile, {
      completedNeighborhoodIds: [...checkpoint.completedNeighborhoodIds, ...completed],
    });
  }

  const errors = output.outcomes.filter((o) => o.status === 'error').length;
  if (errors > 0 && !options.dryRun) {
    console.error(`${errors} neighborhood(s) errored — fix and re-run to resume.`);
    process.exit(1);
  }
}

main();
