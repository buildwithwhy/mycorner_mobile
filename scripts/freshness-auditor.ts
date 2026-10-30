#!/usr/bin/env bun
// Freshness auditor — agentic backend round one (spec Stream C).
//
// Re-verifies curated spots via Google Places (permanently closed, name and
// address drift, vanished listings) and bundled events (stale past
// verifiedAt + 90 days), writing one exception record per problem into
// review-queue/freshness/<YYYY-MM-DD>/. A PR per run is the human-review
// surface; nothing here edits src/data/.
//
// Usage: bun scripts/freshness-auditor.ts [--live] [--fixtures=path] [--queue-root=dir]
//               [--events-dir=dir] [--delay-ms=250] [--max=N]
//
// Modes:
//   default                     dry run — events audited locally (no network);
//                               spots need --fixtures or --live, otherwise skipped
//   --fixtures=path             dry run against a JSON of canned Places responses
//                               keyed by spot id — proves classification end-to-end
//                               with zero network
//   --live                      real Places Find Place calls (needs
//                               GOOGLE_MAPS_API_KEY and Google Maps billing;
//                               rate-limited and resumable via progress.json)

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { londonCuratedSpots } from '../src/data/curatedSpots/london';
import { newYorkCuratedSpots } from '../src/data/curatedSpots/new-york';
import type { LocalSpot } from '../src/types';
import {
  runDateString,
  queueRecordPath,
  writeQueueRecord,
  writeRunSummary,
} from './queue/batch-io';
import {
  auditEventFreshness,
  verifySpot,
  type EventLike,
  type PlaceCandidate,
  type PlacesCheckResult,
} from './queue/freshness-core';
import {
  validateFreshnessRecord,
  type FreshnessRecord,
} from './queue/records';

interface AuditorOptions {
  live: boolean;
  fixturesPath: string | null;
  queueRoot: string;
  eventsDir: string;
  delayMs: number;
  max: number | null;
}

function parseArgs(argv: string[]): AuditorOptions {
  const options: AuditorOptions = {
    live: false,
    fixturesPath: null,
    queueRoot: 'review-queue',
    eventsDir: 'src/data/events',
    delayMs: 250,
    max: null,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--live') options.live = true;
    else if (arg.startsWith('--fixtures=')) options.fixturesPath = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--queue-root=')) options.queueRoot = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--events-dir=')) options.eventsDir = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--delay-ms=')) options.delayMs = Number(arg.split('=')[1]);
    else if (arg.startsWith('--max=')) options.max = Number(arg.split('=')[1]);
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (options.live && options.fixturesPath) {
    console.error('--live and --fixtures are mutually exclusive.');
    process.exit(2);
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    console.error('--delay-ms must be a non-negative number.');
    process.exit(2);
  }
  return options;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

interface Subject {
  id: string;
  neighborhoodId: string;
  name: string;
}

interface SpotSubject extends Subject {
  kind: 'spot';
  spot: LocalSpot;
}

interface EventSubject extends Subject {
  kind: 'event';
  event: EventLike;
}

/** Structural guard for events loaded from arbitrary data files. */
function isEventLike(value: unknown): value is EventLike {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const schedule = v.schedule;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.neighborhoodId === 'string' &&
    typeof v.verifiedAt === 'string' &&
    typeof schedule === 'object' &&
    schedule !== null &&
    typeof (schedule as Record<string, unknown>).kind === 'string'
  );
}

/**
 * Load bundled events by dynamically importing every .ts file in the events
 * directory. The directory may not exist yet (seed data is a separate
 * deliverable) — zero events is a valid state, not an error.
 */
async function loadEventSubjects(eventsDir: string): Promise<{
  subjects: EventSubject[];
  errors: string[];
}> {
  const subjects: EventSubject[] = [];
  const errors: string[] = [];

  let files: string[];
  try {
    files = (await readdir(eventsDir)).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { subjects, errors };
    throw err;
  }

  for (const file of files.sort()) {
    const full = join(eventsDir, file);
    try {
      const mod = (await import(pathToFileURL(full).href)) as Record<string, unknown>;
      const arrays = [mod.default, ...Object.values(mod)].filter(Array.isArray);
      if (arrays.length === 0) {
        errors.push(`${file}: no exported array found`);
        continue;
      }
      for (const arr of arrays) {
        for (const item of arr as unknown[]) {
          if (!isEventLike(item)) {
            errors.push(`${file}: entry is not a recognizable NeighborhoodEvent`);
            continue;
          }
          subjects.push({
            kind: 'event',
            id: item.id,
            neighborhoodId: item.neighborhoodId,
            name: item.title,
            event: item,
          });
        }
      }
    } catch (err) {
      errors.push(`${file}: import failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { subjects, errors };
}

function spotSubjects(spots: LocalSpot[]): SpotSubject[] {
  return spots.map((spot) => ({
    kind: 'spot' as const,
    id: spot.id,
    neighborhoodId: spot.neighborhoodId,
    name: spot.name,
    spot,
  }));
}

// ---------------------------------------------------------------------------
// Places clients (live and fixture)
// ---------------------------------------------------------------------------

interface PlacesClient {
  /** Canned responses by spot id — null when the client has no entry (skip). */
  check(spot: LocalSpot): Promise<PlacesCheckResult | null>;
}

class LivePlacesClient implements PlacesClient {
  constructor(private readonly apiKey: string, private readonly delayMs: number) {}

  async check(spot: LocalSpot): Promise<PlacesCheckResult | null> {
    const input = `${spot.name} ${spot.address ?? ''}`.trim();
    const url =
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
      `?input=${encodeURIComponent(input)}&inputtype=textquery` +
      `&locationbias=circle:500@${spot.location.lat},${spot.location.lng}` +
      '&fields=place_id,name,formatted_address,geometry,business_status' +
      `&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      error_message?: string;
      candidates?: Array<{
        name?: string;
        formatted_address?: string;
        business_status?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
      // Abort the whole run: billing/quota problems invalidate every verdict.
      throw new Error(
        `Places request denied (${data.status}${data.error_message ? `: ${data.error_message}` : ''}) — Google Maps billing is likely disabled. Run aborted; fix billing and re-run.`,
      );
    }

    const candidates: PlaceCandidate[] = (data.candidates ?? []).map((c) => ({
      name: c.name,
      formattedAddress: c.formatted_address,
      businessStatus: c.business_status,
      lat: c.geometry?.location?.lat,
      lng: c.geometry?.location?.lng,
    }));
    return { status: data.status, candidates };
  }
}

class FixturePlacesClient implements PlacesClient {
  constructor(private readonly bySpotId: Map<string, PlacesCheckResult>) {}

  static async load(path: string): Promise<FixturePlacesClient> {
    const raw = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    const bySpotId = new Map<string, PlacesCheckResult>();
    for (const [spotId, value] of Object.entries(raw)) {
      const r = value as { status?: unknown; candidates?: unknown };
      if (typeof r.status !== 'string' || !Array.isArray(r.candidates)) {
        throw new Error(`Fixture entry "${spotId}" must be { status: string, candidates: [] }`);
      }
      bySpotId.set(spotId, { status: r.status, candidates: r.candidates as PlaceCandidate[] });
    }
    return new FixturePlacesClient(bySpotId);
  }

  async check(spot: LocalSpot): Promise<PlacesCheckResult | null> {
    // No fixture entry for a spot = not exercised in this run, never an error.
    return this.bySpotId.get(spot.id) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const options = parseArgs(process.argv);
  const mode = options.live ? 'LIVE' : options.fixturesPath ? 'FIXTURES' : 'DRY RUN (events only)';
  console.log(`Freshness auditor — mode: ${mode}`);

  const notes: string[] = [];
  const errors: string[] = [];
  let spotsChecked = 0;
  let spotsSkipped = 0;

  // Spots: bundled curated data, sorted for deterministic resume order.
  const spots = [...londonCuratedSpots, ...newYorkCuratedSpots].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const eventLoad = await loadEventSubjects(options.eventsDir);
  errors.push(...eventLoad.errors);

  let client: PlacesClient | null = null;
  if (options.live) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set — live verification cannot run.');
      return 1;
    }
    client = new LivePlacesClient(apiKey, options.delayMs);
  } else if (options.fixturesPath) {
    client = await FixturePlacesClient.load(options.fixturesPath);
  }

  // Resume: live runs checkpoint per spot; a re-run skips already-checked ids.
  const runDate = runDateString();
  const progressPath = join(options.queueRoot, 'freshness', runDate, 'progress.json');
  const checked = new Set<string>();
  if (client instanceof LivePlacesClient) {
    try {
      const raw = JSON.parse(await readFile(progressPath, 'utf8')) as string[];
      for (const id of raw) checked.add(id);
      console.log(`Resuming — ${checked.size} spot(s) already checked in this run.`);
    } catch {
      // No progress file: fresh run.
    }
  }

  const startedAt = new Date().toISOString();
  const recordsWritten: string[] = [];
  const verdictCounts: Record<string, number> = {};
  let staleEvents = 0;

  // --- Events: pure local staleness audit (runs in every mode) -------------
  const now = new Date();
  for (const subject of eventLoad.subjects) {
    const staleness = auditEventFreshness(subject.event, now);
    if (!staleness.stale) continue;
    staleEvents += 1;
    verdictCounts['event-stale'] = (verdictCounts['event-stale'] ?? 0) + 1;

    const record: FreshnessRecord = {
      kind: 'event-stale',
      subject: { type: 'event', id: subject.id, neighborhoodId: subject.neighborhoodId, name: subject.name },
      detail: staleness.reason,
      evidence: { checkedAt: now.toISOString(), placesStatus: 'LOCAL' },
      status: 'open',
    };
    const validation = validateFreshnessRecord(record);
    if (!validation.valid) {
      errors.push(`${subject.id}: invalid record — ${validation.errors.join('; ')}`);
      continue;
    }
    const path = queueRecordPath(options.queueRoot, 'freshness', runDate, `${subject.id}-event-stale`);
    recordsWritten.push(await writeQueueRecord(path, record));
    console.log(`EXCEPTION ${subject.id} (${subject.name}) — ${staleness.reason}`);
  }

  // --- Spots: Places re-verification (fixtures or live only) ---------------
  if (client) {
    for (const subject of spotSubjects(spots)) {
      if (checked.has(subject.id)) continue;
      if (options.max !== null && spotsChecked >= options.max) {
        spotsSkipped += 1;
        continue;
      }

      let result: PlacesCheckResult | null;
      try {
        result = await client.check(subject.spot);
      } catch (err) {
        errors.push(`${subject.id}: ${err instanceof Error ? err.message : String(err)}`);
        if (options.live) {
          // Persist progress so a re-run resumes instead of re-spending quota.
          await writeQueueRecord(progressPath, [...checked]);
          break;
        }
        continue;
      }

      if (result === null) {
        spotsSkipped += 1;
        continue;
      }

      spotsChecked += 1;
      checked.add(subject.id);
      const verdict = verifySpot(subject.name, subject.spot.location.lat, subject.spot.location.lng, result);
      verdictCounts[verdict.kind] = (verdictCounts[verdict.kind] ?? 0) + 1;
      if (verdict.kind === 'ok' || verdict.kind === 'spot-unverifiable') continue;

      const record: FreshnessRecord = {
        kind: verdict.kind,
        subject: { type: 'spot', id: subject.id, neighborhoodId: subject.neighborhoodId, name: subject.name },
        detail: verdict.detail,
        evidence: { checkedAt: now.toISOString(), ...verdict.evidence },
        status: 'open',
      };
      const validation = validateFreshnessRecord(record);
      if (!validation.valid) {
        errors.push(`${subject.id}: invalid record — ${validation.errors.join('; ')}`);
        continue;
      }
      const path = queueRecordPath(options.queueRoot, 'freshness', runDate, `${subject.id}-${verdict.kind}`);
      recordsWritten.push(await writeQueueRecord(path, record));
      console.log(`EXCEPTION ${subject.id} (${subject.name}) — ${verdict.kind}: ${verdict.detail}`);

      if (options.live) await sleep(options.delayMs);
    }
    if (options.live) await writeQueueRecord(progressPath, [...checked]);
  } else if (!options.fixturesPath) {
    notes.push(
      `Spot re-verification skipped: dry run without --fixtures makes no network calls. Use --fixtures=<path> (canned responses) or --live (needs GOOGLE_MAPS_API_KEY + billing).`,
    );
  }

  if (eventLoad.errors.length > 0) {
    notes.push(`${eventLoad.errors.length} event-file error(s) — see errors above.`);
  }
  notes.push(`Spots: ${spotsChecked} checked, ${spotsSkipped} skipped (no fixture entry / cap).`);

  const summary = await writeRunSummary(options.queueRoot, 'freshness', runDate, {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun: !options.live,
    recordsWritten,
    counts: { total: spots.length + eventLoad.subjects.length, written: recordsWritten.length, errors: errors.length },
    notes,
  });
  recordsWritten.push(summary);

  console.log(
    `\nDone: ${recordsWritten.length - 1} exception record(s) (${staleEvents} stale event(s)), ` +
      `${errors.length} error(s). Summary: ${summary}`,
  );
  for (const [kind, count] of Object.entries(verdictCounts)) {
    console.log(`  ${kind}: ${count}`);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`ERROR ${e}`);
    return 1;
  }
  return 0;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

process.exitCode = await main();
