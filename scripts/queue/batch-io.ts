// Shared batch-script utilities for the agentic backend (scout, freshness
// auditor, outreach prep). One record per file, batch runs grouped into
// YYYY-MM-DD directories, and a run summary beside them. These are the edges —
// the pure decision logic lives with each agent.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** UTC date of the run, as the batch-run directory name (YYYY-MM-DD). */
export function runDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Filesystem-safe slug for record filenames, derived from a display name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Queue areas. `-dry-run` variants hold fixture-based dry-run reports — the
 *  promote path only ever reads the real directories, so dry-run output can
 *  never enter promotion, no matter what a dry-run record contains. */
export type QueueKind =
  | 'spot-proposals'
  | 'spot-proposals-dry-run'
  | 'freshness'
  | 'outreach';

/**
 * Path for one queue record: <queueRoot>/<kind>/<YYYY-MM-DD>/<slug>.json.
 * One file per record — git diff is the human-review surface, so records are
 * never appended into shared files.
 */
export function queueRecordPath(
  queueRoot: string,
  kind: QueueKind,
  runDate: string,
  slug: string,
): string {
  return join(queueRoot, kind, runDate, `${slug}.json`);
}

/**
 * Write one queue record (file per record). Returns the path written so the
 * caller can list it in the run summary.
 */
export async function writeQueueRecord(
  path: string,
  record: unknown,
): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return path;
}

export interface RunSummary {
  kind: QueueKind;
  runDate: string;
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  recordsWritten: string[];
  counts: { total: number; written: number; errors: number };
  notes?: string[];
}

/** Write the run summary beside the records of a batch run. */
export async function writeRunSummary(
  queueRoot: string,
  kind: QueueKind,
  runDate: string,
  summary: Omit<RunSummary, 'kind' | 'runDate'>,
): Promise<string> {
  const dir = join(queueRoot, kind, runDate);
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'summary.json');
  const full: RunSummary = { kind, runDate, ...summary };
  await writeFile(path, `${JSON.stringify(full, null, 2)}\n`, 'utf8');
  return path;
}
