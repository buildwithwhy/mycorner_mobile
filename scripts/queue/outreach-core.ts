// Outreach prep decision logic: curated data + approved scout promotions →
// outreach queue records. Pure layer — the CLI in scripts/outreach-prep.ts
// wires file I/O and the Places HTTP call.
//
// Two invariants live here, in code:
// 1. Contact fields carry only what Places actually returned — a missing value
//    is `null` plus a flag, never an inference.
// 2. The record is a DRAFT for a human to read (and later send by hand);
//    nothing here transports a message anywhere.

import type { LocalSpot, SpotCategory } from '../../src/types';
import { slugify } from './batch-io';
import {
  validateSpotProposal,
  type OutreachContact,
  type OutreachFlag,
  type SpotProposalRecord,
} from './records';

/** One outreach target assembled from its source (curated data or queue). */
export interface OutreachTarget {
  spotId: string;
  name: string;
  neighborhoodId: string;
  category: SpotCategory;
  /** Existing human-written editorial line, reused in the pitch when present. */
  editorial?: string;
  /** null when the source data has no placeId — enrichment cannot be attempted. */
  placeId: string | null;
  /** Where the target came from, for the run summary. */
  origin: 'curated' | 'approved-proposal';
}

/** What a Place Details call returned, verbatim where it matters. */
export interface EnrichmentResult {
  placesStatus: 'OK' | string;
  phone: string | null;
  website: string | null;
  /** Only set when the call never happened (no placeId) or failed. */
  error?: string;
}

export interface EnrichedOutreachRecord {
  record: {
    spotId: string;
    contact: OutreachContact;
    draftPitch: string;
    enrichedAt: string;
    status: 'draft';
    flag?: OutreachFlag;
  };
  flag: OutreachFlag | null;
  slug: string;
}

// ---------------------------------------------------------------------------
// Target assembly
// ---------------------------------------------------------------------------

/**
 * Extract curated spots from a dataset's TS source text. The datasets are
 * parsed by pattern (same style as promote-core) rather than imported, so the
 * script stays free of the app's runtime import graph. Entries end with
 * `\n  },` inside the `spots` array — the shape every dataset file shares.
 */
export function parseCuratedSpots(source: string): LocalSpot[] {
  const spots: LocalSpot[] = [];
  const entryPattern = /\{\s*\n\s*id: '([^']+)',([\s\S]*?)\n  \},/g;

  for (const [, id, body] of source.matchAll(entryPattern)) {
    const name = matchString(body, 'name');
    const neighborhoodId = matchString(body, 'neighborhoodId');
    const category = matchString(body, 'category');
    if (!name || !neighborhoodId || !category) continue;

    const spot: LocalSpot = {
      id,
      neighborhoodId,
      name,
      category: category as SpotCategory,
      location: { lat: 0, lng: 0 },
      source: 'curated',
    };
    const placeId = matchString(body, 'placeId');
    if (placeId) spot.placeId = placeId;
    const editorial = matchString(body, 'editorial');
    if (editorial) spot.editorial = editorial;
    spots.push(spot);
  }
  return spots;
}

function matchString(body: string, field: string): string | undefined {
  const match = body.match(new RegExp(`${field}: '((?:[^'\\\\]|\\\\.)*)',`));
  return match ? match[1].replace(/\\'/g, "'") : undefined;
}

/** Neighborhood id → display name, parsed from the neighborhood datasets. */
export function parseNeighborhoodNames(sources: string[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const source of sources) {
    for (const [, id, body] of source.matchAll(/id: '([^']+)',([\s\S]*?)\n  \},/g)) {
      const name = body.match(/\n    name: '((?:[^'\\]|\\.)*)',/);
      if (name && !names.has(id)) names.set(id, name[1]);
    }
  }
  return names;
}

/**
 * Approved scout promotions are outreach targets too — a human marked them
 * `approved` in the queue PR, and their placeId was verified at proposal time.
 * Records that fail validation or are not approved are skipped with a reason;
 * they are the promote-spot script's concern, not ours.
 */
export function targetsFromApprovedProposals(
  records: { path: string; raw: unknown }[],
): { targets: OutreachTarget[]; skipped: string[] } {
  const targets: OutreachTarget[] = [];
  const skipped: string[] = [];

  for (const { path, raw } of records) {
    const validation = validateSpotProposal(raw);
    if (!validation.valid) {
      skipped.push(`${path}: invalid record (${validation.errors.join('; ')})`);
      continue;
    }
    const record = raw as SpotProposalRecord;
    if (record.status !== 'approved') {
      skipped.push(`${path}: status '${record.status}' — only approved records become targets`);
      continue;
    }
    targets.push({
      spotId: slugify(record.proposedSpot.name),
      name: record.proposedSpot.name,
      neighborhoodId: record.evidence.insideNeighborhood,
      category: record.proposedSpot.category,
      editorial: record.proposedSpot.rationale,
      placeId: record.proposedSpot.googlePlaceId,
      origin: 'approved-proposal',
    });
  }
  return { targets, skipped };
}

// ---------------------------------------------------------------------------
// Contact building — verbatim or null, never inferred
// ---------------------------------------------------------------------------

export function buildContact(enrichment: EnrichmentResult | null): OutreachContact {
  if (!enrichment || enrichment.placesStatus !== 'OK') {
    return { phone: null, website: null, emailFound: null };
  }
  return {
    phone: enrichment.phone,
    website: enrichment.website,
    // No email source exists anywhere in round one — the field is a signal
    // that enrichment found none, not a placeholder for one.
    emailFound: null,
  };
}

/**
 * The honesty flag for a record, or null when the contact block is complete
 * (Places returned at least one usable field).
 */
export function flagFor(
  target: OutreachTarget,
  enrichment: EnrichmentResult | null,
): OutreachFlag | null {
  if (!target.placeId) return 'no-place-id';
  if (!enrichment || enrichment.placesStatus !== 'OK') return 'enrichment-failed';
  if (!enrichment.phone && !enrichment.website) return 'missing-contact';
  return null;
}

// ---------------------------------------------------------------------------
// Pitch drafting
// ---------------------------------------------------------------------------

/** Pitch ask angle per spot category group. */
type CategoryGroup = 'food-drink' | 'retail' | 'place';

const CATEGORY_GROUPS: Record<SpotCategory, CategoryGroup> = {
  cafe: 'food-drink',
  restaurant: 'food-drink',
  bar: 'food-drink',
  shop: 'retail',
  market: 'retail',
  park: 'place',
  museum: 'place',
  landmark: 'place',
  other: 'place',
};

const EVENT_ASKS: Record<CategoryGroup, string> = {
  'food-drink': 'a supper club, a tasting night, or a meet-the-neighbors evening',
  retail: 'an after-hours market evening, a launch, or a low-key gathering',
  place: 'a guided walk, an open evening, or a community hour',
};

const PERK_ASKS: Record<CategoryGroup, string> = {
  'food-drink': 'a weekday discount for locals, a free coffee with a pastry — whatever is easy',
  retail: '10% off on weekdays, a free gift wrap — whatever is easy',
  place: 'discounted entry, a members’ hour — whatever is easy',
};

const CATEGORY_LINES: Record<CategoryGroup, string> = {
  'food-drink': 'food and drink spots',
  retail: 'local shops and markets',
  place: 'places that give a neighborhood its character',
};

/**
 * Draft the pitch: Subject line + body in one string (the human edits both
 * before anything is ever sent). Copy only reuses text a human wrote — the
 * spot's editorial line when present — or falls back to a plain category
 * description. It never invents specifics about the business.
 */
export function draftPitch(
  target: OutreachTarget,
  neighborhoodName: string | undefined,
): string {
  const group = CATEGORY_GROUPS[target.category];
  const neighborhood = neighborhoodName ?? `neighborhood ${target.neighborhoodId}`;
  // The editorial line stands as its own sentence — splicing it mid-sentence
  // would mangle its capitalization. Fallback is a plain category noun phrase.
  const why = target.editorial ?? `It's one of the ${CATEGORY_LINES[group]} we love pointing people to.`;
  const eventAsk = EVENT_ASKS[group];
  const perkAsk = PERK_ASKS[group];

  return [
    `Subject: A small idea for ${target.name} — and for ${neighborhood}`,
    '',
    `Hi ${target.name} team,`,
    '',
    `We're MyCorner, an app that helps people find the neighborhood that feels like them — and then make the most of it once they've moved in. ${neighborhood} is one of the areas we cover.`,
    '',
    why,
    '',
    `We're inviting a handful of neighborhood favorites to be part of that, in one of two easy ways:`,
    '',
    `· Host a small event — ${eventAsk} — that we'd promote to locals in ${neighborhood}.`,
    `· Offer a local perk — ${perkAsk} — that we'd list in the app as a resident perk.`,
    '',
    `There's no cost and no commitment. If either sounds interesting, just reply to this note and we'll take it from there.`,
    '',
    '— The MyCorner team',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Record assembly
// ---------------------------------------------------------------------------

/**
 * Build one outreach queue record. `usedSlugs` tracks slugs already handed out
 * this run so two same-named spots never overwrite each other's files.
 */
export function buildOutreachRecord(
  target: OutreachTarget,
  enrichment: EnrichmentResult | null,
  neighborhoodName: string | undefined,
  enrichedAt: string,
  usedSlugs: Map<string, number>,
): EnrichedOutreachRecord {
  const baseSlug = slugify(target.name);
  const count = usedSlugs.get(baseSlug) ?? 0;
  usedSlugs.set(baseSlug, count + 1);
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

  const contact = buildContact(enrichment);
  const flag = flagFor(target, enrichment);

  return {
    record: {
      spotId: target.spotId,
      contact,
      draftPitch: draftPitch(target, neighborhoodName),
      enrichedAt,
      status: 'draft',
      ...(flag ? { flag } : {}),
    },
    flag,
    slug,
  };
}
