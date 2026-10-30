#!/usr/bin/env bun
// Outreach PREP agent (spec: "Agentic round one", Stream C — outreach prep).
// For each target spot — curated data plus approved scout promotions — it
// enriches contact details via Google Place Details (phone, website; email is
// never searched or guessed) and writes one draft-pitch record per spot into
// review-queue/outreach/YYYY-MM-DD/.
//
// NOTHING IS EVER SENT. There is no email provider, no sending client, no CRM
// table — the only network call in this file is a read-only Place Details
// lookup. Drafts live in the queue and a human sends them by hand.
//
// Usage:
//   GOOGLE_MAPS_API_KEY=... bun scripts/outreach-prep.ts [--limit=N]
//   bun scripts/outreach-prep.ts --fixtures --out=<dir>     # no network, no key
//   bun scripts/outreach-prep.ts --dry-run                  # lookups, no writes
//   bun scripts/outreach-prep.ts --dry-run --fixtures       # fully offline
//
// Flags:
//   --dry-run      compute and print records without writing anything
//   --fixtures     use bundled fixture Place Details responses instead of network
//   --out=<dir>    queue root for written records (default: review-queue;
//                  required with --fixtures so fixture data never lands there)
//   --data-root=<dir>  curated data root (default: src/data)
//   --limit=N      cap the number of targets this run processes
//   --delay-ms=N   pause between real Place Details calls (default: 250)

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  runDateString,
  queueRecordPath,
  writeQueueRecord,
  writeRunSummary,
} from './queue/batch-io';
import {
  buildOutreachRecord,
  parseCuratedSpots,
  parseNeighborhoodNames,
  targetsFromApprovedProposals,
  type EnrichmentResult,
  type OutreachTarget,
} from './queue/outreach-core';

interface Options {
  dryRun: boolean;
  fixtures: boolean;
  out: string | null;
  dataRoot: string;
  limit: number | null;
  delayMs: number;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    dryRun: false,
    fixtures: false,
    out: null,
    dataRoot: 'src/data',
    limit: null,
    delayMs: 250,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--fixtures') options.fixtures = true;
    else if (arg.startsWith('--out=')) options.out = arg.split('=')[1];
    else if (arg.startsWith('--data-root=')) options.dataRoot = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1]);
    else if (arg.startsWith('--delay-ms=')) options.delayMs = Number(arg.split('=')[1]);
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (options.fixtures && !options.out && !options.dryRun) {
    console.error(
      '--fixtures requires --out=<dir>: fixture records must never be written\n' +
        'into the real review-queue (they contain fake businesses).',
    );
    process.exit(2);
  }
  if (Number.isNaN(options.delayMs) || options.delayMs < 0) options.delayMs = 250;
  return options;
}

// ---------------------------------------------------------------------------
// Target loading
// ---------------------------------------------------------------------------

const CITY_DATASETS = ['london', 'new-york'] as const;

interface RecordFile {
  path: string;
  raw: unknown;
}

async function loadApprovedProposals(queueRoot: string): Promise<RecordFile[]> {
  const root = join(queueRoot, 'spot-proposals');
  const files: RecordFile[] = [];

  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.json') && entry.name !== 'summary.json') {
        files.push({ path: full, raw: JSON.parse(await readFile(full, 'utf8')) });
      }
    }
  }

  try {
    await walk(root);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return files;
    throw err;
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Curated spots first (deterministic order), then approved scout promotions —
 * deduplicated by placeId so a promoted spot never gets a second pitch while
 * its curated entry exists.
 */
async function loadTargets(options: Options): Promise<{
  targets: OutreachTarget[];
  skipped: string[];
}> {
  const curated: OutreachTarget[] = [];
  for (const city of CITY_DATASETS) {
    const source = await readFile(join(options.dataRoot, 'curatedSpots', `${city}.ts`), 'utf8');
    for (const spot of parseCuratedSpots(source)) {
      curated.push({
        spotId: spot.id,
        name: spot.name,
        neighborhoodId: spot.neighborhoodId,
        category: spot.category,
        editorial: spot.editorial,
        placeId: spot.placeId ?? null,
        origin: 'curated',
      });
    }
  }
  curated.sort((a, b) => a.spotId.localeCompare(b.spotId));

  const { targets: fromQueue, skipped } = targetsFromApprovedProposals(
    await loadApprovedProposals(options.out ?? 'review-queue'),
  );

  const seenPlaceIds = new Set(curated.filter((t) => t.placeId).map((t) => t.placeId));
  const seenCurated = new Set(curated.map((t) => `${t.spotId}`));
  for (const target of fromQueue) {
    if (target.placeId && seenPlaceIds.has(target.placeId)) {
      skipped.push(`${target.spotId}: placeId already in curated data`);
      continue;
    }
    if (seenCurated.has(target.spotId)) {
      skipped.push(`${target.spotId}: curated target already loaded`);
      continue;
    }
    curated.push(target);
  }

  return { targets: curated, skipped };
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

/** Statuses that mean the key/account itself is rejected — abort the run. */
const HARD_BLOCK_STATUSES = new Set(['REQUEST_DENIED', 'OVER_QUERY_LIMIT']);

interface FixturePlaceDetails {
  status: 'OK' | string;
  phone?: string;
  website?: string;
}

/** Bundled Place Details responses for offline/fixture runs. */
const FIXTURE_PLACE_DETAILS: Record<string, FixturePlaceDetails> = {
  ChIJfixture0001: {
    status: 'OK',
    phone: '+44 20 7946 0001',
    website: 'https://fixture-one.example.com',
  },
  ChIJfixture0002: { status: 'OK' },
  'ChIJfixture-denied': { status: 'REQUEST_DENIED' },
};

function placeDetailsUrl(placeId: string, key: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set(
    'fields',
    'name,formatted_phone_number,international_phone_number,website',
  );
  url.searchParams.set('key', key);
  return url.toString();
}

async function fetchPlaceContact(placeId: string, key: string): Promise<EnrichmentResult> {
  try {
    const response = await fetch(placeDetailsUrl(placeId, key));
    const data = (await response.json()) as {
      status?: string;
      result?: {
        formatted_phone_number?: string;
        international_phone_number?: string;
        website?: string;
      };
    };
    const status = data.status ?? 'MISSING_STATUS';
    if (status !== 'OK' || !data.result) {
      return { placesStatus: status, phone: null, website: null };
    }
    return {
      placesStatus: 'OK',
      phone: data.result.international_phone_number ?? data.result.formatted_phone_number ?? null,
      website: data.result.website ?? null,
    };
  } catch (err) {
    return {
      placesStatus: 'NETWORK_ERROR',
      phone: null,
      website: null,
      error: String((err as Error).message ?? err),
    };
  }
}

function fixturePlaceContact(placeId: string): EnrichmentResult {
  const fixture = FIXTURE_PLACE_DETAILS[placeId];
  if (!fixture) return { placesStatus: 'NOT_FOUND', phone: null, website: null };
  return {
    placesStatus: fixture.status,
    phone: fixture.phone ?? null,
    website: fixture.website ?? null,
  };
}

// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const options = parseArgs(process.argv);

  const queueRoot = options.out ?? 'review-queue';
  const runDate = runDateString();

  const neighborhoodSources = await Promise.all(
    CITY_DATASETS.map((city) =>
      readFile(join(options.dataRoot, 'neighborhoods', `${city}.ts`), 'utf8'),
    ),
  );
  const neighborhoodNames = parseNeighborhoodNames(neighborhoodSources);

  const { targets, skipped } = await loadTargets(options);
  const selected = options.limit ? targets.slice(0, options.limit) : targets;

  console.log(
    `Outreach prep: ${selected.length} target(s)` +
      `${options.limit ? ` (limit, of ${targets.length})` : ''}` +
      `${options.fixtures ? ' [fixtures]' : ''}${options.dryRun ? ' [dry run]' : ''}`,
  );
  for (const reason of skipped) console.log(`  skipped: ${reason}`);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!options.fixtures && !apiKey) {
    console.error(
      'GOOGLE_MAPS_API_KEY is not set and --fixtures was not passed.\n' +
        'Real runs need a Places-enabled key; use --fixtures for an offline run.',
    );
    return 2;
  }

  // Canary: with billing or key problems every call fails the same way, which
  // would write a run's worth of useless flagged records. Fail fast instead —
  // and cache the canary's successful result so it is not fetched twice.
  const canaryEnrichment = new Map<OutreachTarget, EnrichmentResult>();
  if (!options.fixtures && !options.dryRun) {
    const firstWithPlaceId = selected.find((t) => t.placeId);
    if (firstWithPlaceId?.placeId) {
      const canary = await fetchPlaceContact(firstWithPlaceId.placeId, apiKey!);
      if (canary.placesStatus === 'NETWORK_ERROR') {
        console.error(`Network unreachable, aborting: ${canary.error}`);
        return 3;
      }
      if (HARD_BLOCK_STATUSES.has(canary.placesStatus)) {
        console.error(
          `Places API rejected the request (status: ${canary.placesStatus}). ` +
            'Check billing and key restrictions — nothing written.',
        );
        return 3;
      }
      canaryEnrichment.set(firstWithPlaceId, canary);
    }
  }

  const errors: string[] = [];
  const flags: Record<string, number> = {};
  const recordsWritten: string[] = [];
  let written = 0;
  const usedSlugs = new Map<string, number>();
  const enrichedAt = new Date().toISOString();

  for (const target of selected) {
    let enrichment: EnrichmentResult | null = null;

    if (target.placeId) {
      if (canaryEnrichment.has(target)) {
        enrichment = canaryEnrichment.get(target) ?? null;
      } else if (options.fixtures) {
        enrichment = fixturePlaceContact(target.placeId);
      } else if (!options.dryRun) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        enrichment = await fetchPlaceContact(target.placeId, apiKey!);
        if (enrichment.placesStatus === 'NETWORK_ERROR') {
          errors.push(`${target.spotId}: network error (${enrichment.error})`);
          enrichment = { placesStatus: 'NETWORK_ERROR', phone: null, website: null };
        }
      }
      // --dry-run without --fixtures: enrichment stays null; records print
      // flagged rather than being guessed from a network we did not make.
    }

    const { record, flag, slug } = buildOutreachRecord(
      target,
      enrichment,
      neighborhoodNames.get(target.neighborhoodId),
      enrichedAt,
      usedSlugs,
    );
    flags[flag ?? 'complete'] = (flags[flag ?? 'complete'] ?? 0) + 1;

    const path = queueRecordPath(queueRoot, 'outreach', runDate, slug);
    if (options.dryRun) {
      console.log(`WOULD WRITE ${path}`);
      console.log(JSON.stringify(record, null, 2));
    } else {
      await writeQueueRecord(path, record);
      recordsWritten.push(path.replace(`${queueRoot}/`, ''));
      written += 1;
      console.log(`WROTE ${path} (${flag ?? 'complete'})`);
    }
  }

  if (!options.dryRun) {
    const summaryPath = await writeRunSummary(queueRoot, 'outreach', runDate, {
      startedAt: enrichedAt,
      finishedAt: new Date().toISOString(),
      dryRun: false,
      recordsWritten,
      counts: { total: selected.length, written, errors: errors.length },
      notes: [
        'Prep only: these drafts are never sent by any code path — a human reads, edits, and sends them by hand.',
        options.fixtures ? 'Fixture run: bundled Place Details responses, no network.' : undefined,
        ...Object.entries(flags).map(([flag, count]) => `flag ${flag}: ${count}`),
        ...errors,
      ].filter((note): note is string => note !== undefined),
    });
    console.log(`\nRun summary: ${summaryPath}`);
  }

  console.log(`\n${written} record(s) written${options.dryRun ? ' would be written (dry run)' : ''}.`);
  return 0;
}

process.exitCode = await main();
