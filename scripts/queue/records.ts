// Record schemas for review-queue/ — the human-review surface for the agentic
// backend. Shapes mirror the spec samples; validators are runtime checks so a
// malformed queue file fails loudly instead of poisoning src/data/.

export const SPOT_CATEGORIES = [
  'cafe',
  'restaurant',
  'bar',
  'park',
  'market',
  'museum',
  'shop',
  'landmark',
  'other',
] as const;

export type SpotCategory = (typeof SPOT_CATEGORIES)[number];

export const SPOT_PROPOSAL_STATUSES = ['proposed', 'approved', 'rejected'] as const;
export type SpotProposalStatus = (typeof SPOT_PROPOSAL_STATUSES)[number];

export const OUTREACH_STATUSES = ['draft', 'ready', 'sent-manually'] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

// Freshness-exception kinds mirror the audit taxonomy in CURATED_DATA_AUDIT.md
// (ok / wrong_address / closed / not_found / uncertain) plus stale events.
// `spot-unverifiable` exists for run bookkeeping and is never written to the
// queue — an API error is not a data exception.
export const FRESHNESS_EXCEPTION_KINDS = [
  'spot-closed',
  'spot-name-drift',
  'spot-address-drift',
  'spot-not-found',
  'spot-uncertain',
  'event-stale',
] as const;
export type FreshnessExceptionKind = (typeof FRESHNESS_EXCEPTION_KINDS)[number];

export const FRESHNESS_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type FreshnessStatus = (typeof FRESHNESS_STATUSES)[number];
/**
 * Why a record is missing contact details — honesty flags, never guesses.
 * A record either carries what Places actually returned or it is flagged;
 * nothing is ever inferred or fabricated.
 */
export const OUTREACH_FLAGS = [
  'no-place-id',
  'enrichment-failed',
  'missing-contact',
] as const;
export type OutreachFlag = (typeof OUTREACH_FLAGS)[number];

export interface ProposedSpot {
  name: string;
  googlePlaceId: string;
  address: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  rationale: string;
}

export interface ProposalEvidence {
  ratingCount?: number;
  rating?: number;
  insideNeighborhood: string;
  checkedAt: string;
  placesStatus: string;
}

export interface SpotProposalRecord {
  proposedSpot: ProposedSpot;
  evidence: ProposalEvidence;
  status: SpotProposalStatus;
}

export interface OutreachContact {
  phone: string | null;
  website: string | null;
  emailFound: string | null;
}

export interface OutreachRecord {
  spotId: string;
  contact: OutreachContact;
  draftPitch: string;
  enrichedAt: string;
  status: OutreachStatus;
  /** Set when the record's contact block is incomplete and why (optional for
   *  records written before flags existed). */
  flag?: OutreachFlag;
}

export interface FreshnessSubject {
  type: 'spot' | 'event';
  id: string;
  neighborhoodId: string;
  name: string;
}

/**
 * What the re-verification observed. `placesStatus` is the verbatim Places
 * response status ('OK', 'ZERO_RESULTS', …) or 'LOCAL' for checks that needed
 * no API call (event staleness). `spot-unverifiable` outcomes (billing off,
 * quota errors) are run-level notes, never queue records.
 */
export interface FreshnessEvidence {
  checkedAt: string;
  placesStatus: string;
  businessStatus?: string;
  placesName?: string;
  placesAddress?: string;
  distanceMeters?: number;
  nameSimilarity?: number;
}

export interface FreshnessRecord {
  kind: FreshnessExceptionKind;
  subject: FreshnessSubject;
  detail: string; // human-readable reason, names the rule that tripped
  evidence: FreshnessEvidence;
  status: FreshnessStatus;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const checkObject = (
  value: unknown,
  label: string,
  errors: string[],
): value is Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return true;
  errors.push(`${label} must be an object`);
  return false;
};

const checkField = (
  condition: boolean,
  label: string,
  message: string,
  errors: string[],
): void => {
  if (!condition) errors.push(`${label}: ${message}`);
};

/** Runtime validator for a spot-proposal record read from the queue. */
export function validateSpotProposal(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!checkObject(raw, 'record', errors)) return { valid: false, errors };

  const record = raw as Record<string, unknown>;

  if (!checkObject(record.proposedSpot, 'proposedSpot', errors)) {
    return { valid: false, errors };
  }
  const spot = record.proposedSpot as Record<string, unknown>;

  checkField(isNonEmptyString(spot.name), 'proposedSpot.name', 'required non-empty string', errors);
  checkField(
    isNonEmptyString(spot.googlePlaceId),
    'proposedSpot.googlePlaceId',
    'required non-empty string',
    errors,
  );
  checkField(isNonEmptyString(spot.address), 'proposedSpot.address', 'required non-empty string', errors);
  checkField(isFiniteNumber(spot.lat), 'proposedSpot.lat', 'required finite number', errors);
  checkField(isFiniteNumber(spot.lng), 'proposedSpot.lng', 'required finite number', errors);
  checkField(
    isNonEmptyString(spot.category) && SPOT_CATEGORIES.includes(spot.category as SpotCategory),
    'proposedSpot.category',
    `must be one of ${SPOT_CATEGORIES.join(' | ')}`,
    errors,
  );
  checkField(isNonEmptyString(spot.rationale), 'proposedSpot.rationale', 'required non-empty string', errors);

  if (!checkObject(record.evidence, 'evidence', errors)) {
    return { valid: false, errors };
  }
  const evidence = record.evidence as Record<string, unknown>;

  checkField(
    isNonEmptyString(evidence.insideNeighborhood),
    'evidence.insideNeighborhood',
    'required non-empty string',
    errors,
  );
  checkField(isNonEmptyString(evidence.checkedAt), 'evidence.checkedAt', 'required non-empty string', errors);
  checkField(
    isNonEmptyString(evidence.placesStatus),
    'evidence.placesStatus',
    'required non-empty string',
    errors,
  );
  checkField(
    evidence.rating === undefined || isFiniteNumber(evidence.rating),
    'evidence.rating',
    'must be a finite number when present',
    errors,
  );
  checkField(
    evidence.ratingCount === undefined || isFiniteNumber(evidence.ratingCount),
    'evidence.ratingCount',
    'must be a finite number when present',
    errors,
  );

  checkField(
    SPOT_PROPOSAL_STATUSES.includes(record.status as SpotProposalStatus),
    'status',
    `must be one of ${SPOT_PROPOSAL_STATUSES.join(' | ')}`,
    errors,
  );

  return { valid: errors.length === 0, errors };
}

/** Runtime validator for a freshness-exception record read from the queue. */
export function validateFreshnessRecord(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!checkObject(raw, 'record', errors)) return { valid: false, errors };

  const record = raw as Record<string, unknown>;

  checkField(
    FRESHNESS_EXCEPTION_KINDS.includes(record.kind as FreshnessExceptionKind),
    'kind',
    `must be one of ${FRESHNESS_EXCEPTION_KINDS.join(' | ')}`,
    errors,
  );
  checkField(
    isNonEmptyString(record.detail),
    'detail',
    'required non-empty string',
    errors,
  );
  checkField(
    FRESHNESS_STATUSES.includes(record.status as FreshnessStatus),
    'status',
    `must be one of ${FRESHNESS_STATUSES.join(' | ')}`,
    errors,
  );

  if (!checkObject(record.subject, 'subject', errors)) {
    return { valid: false, errors };
  }
  const subject = record.subject as Record<string, unknown>;
  checkField(
    subject.type === 'spot' || subject.type === 'event',
    'subject.type',
    "must be 'spot' or 'event'",
    errors,
  );
  checkField(isNonEmptyString(subject.id), 'subject.id', 'required non-empty string', errors);
  checkField(
    isNonEmptyString(subject.neighborhoodId),
    'subject.neighborhoodId',
    'required non-empty string',
    errors,
  );
  checkField(isNonEmptyString(subject.name), 'subject.name', 'required non-empty string', errors);

  if (!checkObject(record.evidence, 'evidence', errors)) {
    return { valid: false, errors };
  }
  const evidence = record.evidence as Record<string, unknown>;
  checkField(
    isNonEmptyString(evidence.checkedAt),
    'evidence.checkedAt',
    'required non-empty string',
    errors,
  );
  checkField(
    isNonEmptyString(evidence.placesStatus),
    'evidence.placesStatus',
    'required non-empty string',
    errors,
  );
  for (const field of ['placesName', 'placesAddress', 'businessStatus'] as const) {
    checkField(
      evidence[field] === undefined || isNonEmptyString(evidence[field]),
      `evidence.${field}`,
      'must be a non-empty string when present',
      errors,
    );
  }
  for (const field of ['distanceMeters', 'nameSimilarity'] as const) {
    checkField(
      evidence[field] === undefined || isFiniteNumber(evidence[field]),
      `evidence.${field}`,
      'must be a finite number when present',
      errors,
    );
  }

  return { valid: errors.length === 0, errors };
}

/** Runtime validator for an outreach-prep record read from the queue. */
export function validateOutreachRecord(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!checkObject(raw, 'record', errors)) return { valid: false, errors };

  const record = raw as Record<string, unknown>;

  checkField(isNonEmptyString(record.spotId), 'spotId', 'required non-empty string', errors);
  checkField(isNonEmptyString(record.draftPitch), 'draftPitch', 'required non-empty string', errors);
  checkField(isNonEmptyString(record.enrichedAt), 'enrichedAt', 'required non-empty string', errors);

  if (!checkObject(record.contact, 'contact', errors)) {
    return { valid: false, errors };
  }
  const contact = record.contact as Record<string, unknown>;
  for (const field of ['phone', 'website', 'emailFound'] as const) {
    checkField(
      contact[field] === null || isNonEmptyString(contact[field]),
      `contact.${field}`,
      'must be a string or null',
      errors,
    );
  }

  checkField(
    OUTREACH_STATUSES.includes(record.status as OutreachStatus),
    'status',
    `must be one of ${OUTREACH_STATUSES.join(' | ')}`,
    errors,
  );

  checkField(
    record.flag === undefined ||
      record.flag === null ||
      OUTREACH_FLAGS.includes(record.flag as OutreachFlag),
    'flag',
    `must be one of ${OUTREACH_FLAGS.join(' | ')} when present`,
    errors,
  );

  return { valid: errors.length === 0, errors };
}
