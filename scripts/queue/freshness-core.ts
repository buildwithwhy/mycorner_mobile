// Pure decision logic for the freshness auditor: given what Places returned
// (or a fixture standing in for it), decide whether a curated spot or event
// is still fresh. No I/O here — the CLI owns reading data and writing queue
// records, so the fixture test drives this logic end-to-end without network.

import type { FreshnessExceptionKind, FreshnessEvidence } from './records';

/** Verdicts for a spot re-verification. Only the exception kinds are queued. */
export type SpotVerdictKind =
  | 'ok'
  | 'spot-closed'
  | 'spot-name-drift'
  | 'spot-address-drift'
  | 'spot-not-found'
  | 'spot-uncertain'
  | 'spot-unverifiable';

/**
 * Classification thresholds, mirroring the audit taxonomy in
 * CURATED_DATA_AUDIT.md (ok / wrong_address / closed / not_found / uncertain).
 * They are deliberately conservative: uncertain beats a wrong confident call.
 */
export const AUDIT_THRESHOLDS = {
  /** Below this name similarity the Places result is not the same business. */
  matchSimilarityMin: 0.34,
  /** At or above this similarity the result is confidently the same business. */
  confidentSimilarity: 0.7,
  /** Places location farther than this from the curated spot means address drift. */
  addressDriftMeters: 250,
} as const;

/** One Places candidate as the auditor consumes it (live response or fixture). */
export interface PlaceCandidate {
  name?: string;
  formattedAddress?: string;
  businessStatus?: string;
  lat?: number;
  lng?: number;
}

export interface PlacesCheckResult {
  /** Verbatim Places response status: 'OK' | 'ZERO_RESULTS' | 'REQUEST_DENIED' | … */
  status: string;
  candidates: PlaceCandidate[];
}

export interface SpotVerdict {
  kind: SpotVerdictKind;
  detail: string;
  evidence: Omit<FreshnessEvidence, 'checkedAt'>;
}

/** Normalized name similarity (Dice coefficient over character bigrams), 0–1. */
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .join(' ');

  const sa = norm(a);
  const sb = norm(b);
  if (sa.length < 2 || sb.length < 2) return sa === sb ? 1 : 0;

  const bigrams = (s: string): Map<string, number> => {
    const counts = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2);
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    return counts;
  };

  const ga = bigrams(sa);
  const gb = bigrams(sb);
  let overlap = 0;
  for (const [gram, count] of ga) overlap += Math.min(count, gb.get(gram) ?? 0);
  return (2 * overlap) / (sa.length - 1 + (sb.length - 1));
}

/** Great-circle distance in meters. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const isClosedStatus = (businessStatus: string | undefined): boolean =>
  businessStatus === 'CLOSED_PERMANENTLY' || businessStatus === 'CLOSED_TEMPORARILY';

interface ScoredCandidate {
  candidate: PlaceCandidate;
  similarity: number;
  /** Undefined when the candidate carries no geometry. */
  distance: number | undefined;
}

/**
 * Classify one curated spot against what Places returned. A business can move
 * within its block or rename slightly without being an exception, so verdicts
 * layer: closed beats location beats name.
 */
export function verifySpot(
  spotName: string,
  spotLat: number,
  spotLng: number,
  result: PlacesCheckResult,
): SpotVerdict {
  const t = AUDIT_THRESHOLDS;

  const verdictFrom = (
    kind: SpotVerdictKind,
    detail: string,
    scored: ScoredCandidate,
  ): SpotVerdict => ({
    kind,
    detail,
    evidence: {
      placesStatus: result.status,
      ...(scored.candidate.name !== undefined ? { placesName: scored.candidate.name } : {}),
      ...(scored.candidate.formattedAddress !== undefined
        ? { placesAddress: scored.candidate.formattedAddress }
        : {}),
      ...(scored.candidate.businessStatus !== undefined
        ? { businessStatus: scored.candidate.businessStatus }
        : {}),
      nameSimilarity: round3(scored.similarity),
      ...(scored.distance !== undefined ? { distanceMeters: Math.round(scored.distance) } : {}),
    },
  });

  if (result.status === 'ZERO_RESULTS') {
    return {
      kind: 'spot-not-found',
      detail:
        'Places Find Place returned ZERO_RESULTS — no listing found for this name near the curated location.',
      evidence: { placesStatus: result.status },
    };
  }
  if (result.status !== 'OK') {
    // REQUEST_DENIED (billing off), OVER_QUERY_LIMIT, etc. — an API problem,
    // not evidence about the spot. Never queued as an exception.
    return {
      kind: 'spot-unverifiable',
      detail: `Places request failed with status ${result.status} — verification could not run.`,
      evidence: { placesStatus: result.status },
    };
  }
  if (result.candidates.length === 0) {
    return {
      kind: 'spot-not-found',
      detail: 'Places Find Place returned OK with no candidates — no listing found.',
      evidence: { placesStatus: result.status },
    };
  }

  const scored: ScoredCandidate[] = result.candidates.map((candidate) => ({
    candidate,
    similarity: candidate.name !== undefined ? nameSimilarity(spotName, candidate.name) : 0,
    distance:
      candidate.lat !== undefined && candidate.lng !== undefined
        ? haversineMeters(spotLat, spotLng, candidate.lat, candidate.lng)
        : undefined,
  }));

  const strong = scored.filter((s) => s.similarity >= t.confidentSimilarity);
  if (strong.length > 0) {
    const closed = strong.find((s) => isClosedStatus(s.candidate.businessStatus));
    if (closed) {
      return verdictFrom(
        'spot-closed',
        `Places reports business_status ${closed.candidate.businessStatus} for a confident name match.`,
        closed,
      );
    }
    const near = strong.filter((s) => s.distance !== undefined && s.distance <= t.addressDriftMeters);
    if (near.length > 0) {
      const nearest = near.reduce((a, b) => ((a.distance ?? Infinity) <= (b.distance ?? Infinity) ? a : b));
      return verdictFrom('ok', 'Confident name match within address-drift distance.', nearest);
    }
    const withDistance = strong.filter((s) => s.distance !== undefined);
    if (withDistance.length > 0) {
      const nearest = withDistance.reduce((a, b) =>
        (a.distance ?? Infinity) <= (b.distance ?? Infinity) ? a : b,
      );
      return verdictFrom(
        'spot-address-drift',
        `Confident name match but Places places it ${Math.round(nearest.distance ?? 0)}m from the curated coordinates.`,
        nearest,
      );
    }
    // Confident name but no geometry to compare — can't rule on address.
    return verdictFrom('spot-uncertain', 'Confident name match without location data in the Places result.', strong[0]);
  }

  const mid = scored.filter((s) => s.similarity >= t.matchSimilarityMin);
  if (mid.length > 0) {
    const nearMid = mid.filter((s) => s.distance !== undefined && s.distance <= t.addressDriftMeters);
    if (nearMid.length > 0) {
      const nearest = nearMid.reduce((a, b) => ((a.distance ?? Infinity) <= (b.distance ?? Infinity) ? a : b));
      return verdictFrom(
        'spot-name-drift',
        `Listing at the curated location is now named "${nearest.candidate.name ?? 'unknown'}" — likely renamed or replaced.`,
        nearest,
      );
    }
    return verdictFrom(
      'spot-uncertain',
      `Closest Places match "${mid[0].candidate.name ?? 'unknown'}" is only a partial name match${mid[0].distance !== undefined ? ` (${Math.round(mid[0].distance)}m away)` : ''} — ambiguous.`,
      mid[0],
    );
  }

  const best = scored.reduce((a, b) => (a.similarity >= b.similarity ? a : b));
  return verdictFrom(
    'spot-not-found',
    `Closest Places match "${best.candidate.name ?? 'unknown'}" (similarity ${round3(best.similarity)}) is not this business — listing likely gone.`,
    best,
  );
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// Event freshness — pure local check, no Places call
// ---------------------------------------------------------------------------

/** The subset of NeighborhoodEvent the staleness rules need. */
export interface EventLike {
  id: string;
  title: string;
  neighborhoodId: string;
  verifiedAt: string;
  schedule: { kind: string; startDate?: string; endDate?: string };
}

/** How far past the event's last verification before it counts as stale. */
export const STALENESS_WINDOW_DAYS = 90;

export interface EventStaleness {
  stale: boolean;
  reason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value: string | undefined): Date | null => {
  if (value === undefined) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Staleness rules (spec: "stale events past verifiedAt + 90d"):
 *  1. not re-verified within the staleness window — the primary rule;
 *  2. a dated event whose schedule has fully passed is stale regardless;
 *  3. an unparseable verifiedAt is itself an exception.
 * Recurring events only age out via rule 1.
 */
export function auditEventFreshness(event: EventLike, now: Date): EventStaleness {
  const verified = parseDate(event.verifiedAt);
  if (!verified) {
    return { stale: true, reason: `verifiedAt "${event.verifiedAt}" is not a parseable date.` };
  }
  const ageDays = Math.floor((now.getTime() - verified.getTime()) / DAY_MS);
  if (ageDays > STALENESS_WINDOW_DAYS) {
    return {
      stale: true,
      reason: `Last verified ${event.verifiedAt.slice(0, 10)} (${ageDays} days ago) — past the ${STALENESS_WINDOW_DAYS}-day freshness window.`,
    };
  }
  if (event.schedule.kind === 'date') {
    const end = parseDate(event.schedule.endDate ?? event.schedule.startDate);
    if (end && end.getTime() < now.getTime()) {
      return {
        stale: true,
        reason: `Dated event ended ${(end.toISOString().slice(0, 10))} — the schedule has passed.`,
      };
    }
  }
  return { stale: false, reason: 'fresh' };
}

/** Map a staleness result to the queue kind (only exceptions get recorded). */
export function eventExceptionKind(staleness: EventStaleness): FreshnessExceptionKind | null {
  return staleness.stale ? 'event-stale' : null;
}
