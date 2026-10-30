#!/usr/bin/env bun
// Promote approved spot proposals from review-queue/spot-proposals/ into
// src/data/curatedSpots/. The human review happens in the queue PR — a person
// edits `status` to "approved"; this script trusts nothing else and refuses
// every record that is not approved with valid evidence (see promote-core.ts).
//
// Usage: bun scripts/promote-spot.ts [--dry-run] [--queue-root=review-queue] [--data-root=src/data]

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runDateString } from './queue/batch-io';
import {
  appendEntryToDataset,
  decidePromotion,
  type DatasetName,
  type QueueSources,
} from './queue/promote-core';

interface PromoteOptions {
  dryRun: boolean;
  queueRoot: string;
  dataRoot: string;
}

function parseArgs(argv: string[]): PromoteOptions {
  const options: PromoteOptions = {
    dryRun: false,
    queueRoot: 'review-queue',
    dataRoot: 'src/data',
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--queue-root=')) options.queueRoot = arg.split('=')[1];
    else if (arg.startsWith('--data-root=')) options.dataRoot = arg.split('=')[1];
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

interface RecordFile {
  path: string;
  raw: unknown;
}

/** All spot-proposal records in the queue, one file per record. */
async function loadQueueRecords(queueRoot: string): Promise<RecordFile[]> {
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

async function main(): Promise<number> {
  const options = parseArgs(process.argv);
  const cityFile = (dir: string, name: DatasetName): string =>
    join(options.dataRoot, dir, `${name}.ts`);

  const sources: QueueSources = {
    neighborhoods: {
      london: await readFile(cityFile('neighborhoods', 'london'), 'utf8'),
      'new-york': await readFile(cityFile('neighborhoods', 'new-york'), 'utf8'),
    },
    curatedSpots: {
      london: await readFile(cityFile('curatedSpots', 'london'), 'utf8'),
      'new-york': await readFile(cityFile('curatedSpots', 'new-york'), 'utf8'),
    },
  };
  const datasetFiles: Record<DatasetName, string> = {
    london: cityFile('curatedSpots', 'london'),
    'new-york': cityFile('curatedSpots', 'new-york'),
  };

  const records = await loadQueueRecords(options.queueRoot);
  if (records.length === 0) {
    console.log('No spot-proposal records found in the queue.');
    return 0;
  }

  const promotedAt = runDateString();
  const updated: Partial<Record<DatasetName, string>> = {};
  let promoted = 0;
  let refused = 0;

  for (const { path, raw } of records) {
    // Sequential per dataset so a duplicate within the same run is caught
    // against the already-updated source text.
    const decision = decidePromotion(raw, currentSources(sources, updated), promotedAt);
    const label = path.replace(`${options.queueRoot}/`, '');

    if (!decision.ok) {
      refused += 1;
      console.log(`REFUSED  ${label} — ${decision.reason}: ${decision.detail}`);
      continue;
    }

    promoted += 1;
    updated[decision.dataset] = appendEntryToDataset(
      updated[decision.dataset] ?? sources.curatedSpots[decision.dataset],
      decision.entryText,
    );
    console.log(
      `PROMOTED ${label} → ${datasetFiles[decision.dataset]} (id: ${decision.spotId})`,
    );
  }

  if (!options.dryRun) {
    for (const [name, source] of Object.entries(updated)) {
      await writeFile(datasetFiles[name as DatasetName], source, 'utf8');
    }
  }

  console.log(
    `\n${promoted} promoted, ${refused} refused${options.dryRun ? ' (dry run — nothing written)' : ''}.`,
  );
  return refused > 0 ? 1 : 0;
}

function currentSources(
  base: QueueSources,
  updated: Partial<Record<DatasetName, string>>,
): QueueSources {
  return {
    neighborhoods: base.neighborhoods,
    curatedSpots: { ...base.curatedSpots, ...updated },
  };
}

process.exitCode = await main();
