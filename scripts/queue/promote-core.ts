// Promotion logic for spot proposals: queue record → curated dataset entry.
// Pure decision layer — the CLI in scripts/promote-spot.ts wires file I/O.
//
// The invariant is enforced here, in code: a record is promotable only when it
// is marked `approved` by a human AND carries a Google placeId AND the evidence
// block reports a successful Places check. Everything else is refused with a
// named reason.

import type { LocalSpot } from '../../src/types';
import { slugify } from './batch-io';
import { validateSpotProposal, type SpotProposalRecord } from './records';

export type DatasetName = 'london' | 'new-york';

/** Per-city file sources: neighborhood ids are resolved in the neighborhoods
 *  datasets; spot ids/placeIds are checked in the curatedSpots datasets. */
export interface QueueSources {
  neighborhoods: DatasetSources;
  curatedSpots: DatasetSources;
}

export interface DatasetSources {
  london: string;
  'new-york': string;
}

export type PromoteDecision =
  | {
      ok: true;
      dataset: DatasetName;
      /** TS source for the entry, ready to insert into the dataset file. */
      entryText: string;
      spot: LocalSpot;
      spotId: string;
    }
  | { ok: false; reason: RefusalReason; detail: string };

export type RefusalReason =
  | 'INVALID_RECORD'
  | 'NOT_APPROVED'
  | 'MISSING_GOOGLE_PLACE_ID'
  | 'PLACES_STATUS_NOT_OK'
  | 'UNKNOWN_NEIGHBORHOOD'
  | 'DUPLICATE_SPOT';

/** Does a neighborhood id live in this dataset source? Ids appear as `id: '<id>',`. */
export function datasetContainsNeighborhood(id: string, source: string): boolean {
  return source.includes(`id: '${id}',`);
}

/**
 * Decide whether a spot-proposal record may be promoted, and build the dataset
 * entry if so. `promotedAt` stamps the provenance comment.
 */
export function decidePromotion(
  raw: unknown,
  sources: QueueSources,
  promotedAt: string,
): PromoteDecision {
  const validation = validateSpotProposal(raw);
  if (!validation.valid) {
    // A missing placeId is the spec's named refusal, not generic malformation.
    if (validation.errors.some((e) => e.startsWith('proposedSpot.googlePlaceId'))) {
      return {
        ok: false,
        reason: 'MISSING_GOOGLE_PLACE_ID',
        detail: 'a Google placeId is required for every promoted spot',
      };
    }
    return {
      ok: false,
      reason: 'INVALID_RECORD',
      detail: validation.errors.join('; '),
    };
  }
  const record = raw as SpotProposalRecord;

  if (record.status !== 'approved') {
    return {
      ok: false,
      reason: 'NOT_APPROVED',
      detail: `status is '${record.status}' — a human must mark it 'approved' in the queue PR`,
    };
  }
  if (!record.proposedSpot.googlePlaceId.trim()) {
    return {
      ok: false,
      reason: 'MISSING_GOOGLE_PLACE_ID',
      detail: 'a Google placeId is required for every promoted spot',
    };
  }
  if (record.evidence.placesStatus !== 'OK') {
    return {
      ok: false,
      reason: 'PLACES_STATUS_NOT_OK',
      detail: `evidence.placesStatus is '${record.evidence.placesStatus}' — only 'OK' is promotable`,
    };
  }

  const neighborhoodId = record.evidence.insideNeighborhood;
  const inLondon = datasetContainsNeighborhood(neighborhoodId, sources.neighborhoods.london);
  const inNewYork = datasetContainsNeighborhood(
    neighborhoodId,
    sources.neighborhoods['new-york'],
  );
  if (inLondon === inNewYork) {
    return {
      ok: false,
      reason: 'UNKNOWN_NEIGHBORHOOD',
      detail: `neighborhood id '${neighborhoodId}' resolved ${inLondon ? 'in both' : 'in neither'} dataset`,
    };
  }
  const dataset: DatasetName = inLondon ? 'london' : 'new-york';

  const spotSource = sources.curatedSpots[dataset];
  const spotId = `curated-promoted-${slugify(record.proposedSpot.name)}`;
  if (
    spotSource.includes(`placeId: '${record.proposedSpot.googlePlaceId}',`) ||
    spotSource.includes(`id: '${spotId}',`)
  ) {
    return {
      ok: false,
      reason: 'DUPLICATE_SPOT',
      detail: `dataset already contains spot id '${spotId}' or placeId '${record.proposedSpot.googlePlaceId}'`,
    };
  }

  const spot: LocalSpot = {
    id: spotId,
    neighborhoodId,
    name: record.proposedSpot.name,
    category: record.proposedSpot.category,
    // The human-approved rationale doubles as the description — the script
    // never fabricates editorial copy.
    description: record.proposedSpot.rationale,
    address: record.proposedSpot.address,
    location: { lat: record.proposedSpot.lat, lng: record.proposedSpot.lng },
    rating: record.evidence.rating,
    source: 'curated',
    placeId: record.proposedSpot.googlePlaceId,
  };

  return {
    ok: true,
    dataset,
    spot,
    spotId,
    entryText: buildEntryText(spot, record, promotedAt),
  };
}

/** TS string literal in the repo's single-quote style, with escaping. */
function tsString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** TS source for the appended entry, including the provenance comment. */
export function buildEntryText(
  spot: LocalSpot,
  record: SpotProposalRecord,
  promotedAt: string,
): string {
  const provenance = [
    `  // Promoted from review-queue/spot-proposals record (status: approved)`,
    `  // placeId ${record.proposedSpot.googlePlaceId} · checkedAt ${record.evidence.checkedAt} · promoted ${promotedAt}`,
  ].join('\n');

  const fields: string[] = [
    `    id: ${tsString(spot.id)},`,
    `    neighborhoodId: ${tsString(spot.neighborhoodId)},`,
    `    name: ${tsString(spot.name)},`,
    `    category: ${tsString(spot.category)},`,
    `    description: ${tsString(record.proposedSpot.rationale)},`,
    `    address: ${tsString(record.proposedSpot.address)},`,
    `    location: { lat: ${spot.location.lat}, lng: ${spot.location.lng} },`,
    spot.rating !== undefined ? `    rating: ${spot.rating},` : '',
    `    source: 'curated',`,
    `    placeId: ${tsString(record.proposedSpot.googlePlaceId)},`,
  ];

  return `${provenance}\n  {\n${fields.filter(Boolean).join('\n')}\n  },`;
}

/**
 * Insert an entry before the dataset array's closing `];`. Throws if the file
 * does not end with the expected array terminator — a dataset file that fails
 * this check is not in the expected shape and must not be silently edited.
 */
export function appendEntryToDataset(source: string, entryText: string): string {
  const terminator = '];';
  const lastClose = source.lastIndexOf(terminator);
  if (lastClose === -1) {
    throw new Error('dataset file has no `];` terminator — unexpected shape, refusing to edit');
  }
  const before = source.slice(0, lastClose).replace(/\n+$/, '\n');
  return `${before}\n${entryText}\n${source.slice(lastClose)}`;
}
