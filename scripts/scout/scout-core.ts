// Discovery scout: pure decision layer. Decides which categories are
// under-represented in a neighborhood, which Places candidates survive the
// polygon + dedupe filters, and what each proposal record looks like.
//
// The CLI (scripts/run-scout.ts) wires the edges — file I/O, rate limiting,
// the real or fixture Places client — and calls runScout with an injected
// PlacesClient, so this layer never touches the network or the filesystem.

import type { LocalSpot, SpotCategory } from '../../src/types';
import { SPOT_CATEGORIES, type SpotProposalRecord } from '../queue/records';

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export type RingPoint = { latitude: number; longitude: number };
export type Ring = RingPoint[];
export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Vertices with the closing repeat (first === last) collapsed. */
export function uniqueRingVertices(ring: Ring): RingPoint[] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first.latitude === last.latitude && first.longitude === last.longitude
    ? ring.slice(0, -1)
    : ring;
}

/** A ring is usable when it encloses area: at least 3 distinct vertices. */
export function isValidRing(ring: Ring): boolean {
  return uniqueRingVertices(ring).length >= 3;
}

/** Mean of the ring's unique vertices — inside for the near-convex Voronoi
 *  cells the app bundles. Edges wrap, so an unclosed ring is treated as closed. */
export function pointInRing(point: LatLng, ring: Ring): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  const px = point.lng;
  const py = point.lat;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i++) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;
    const crosses = yi > py !== yj > py;
    if (crosses && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function ringCentroid(ring: Ring): LatLng {
  const vertices = uniqueRingVertices(ring);
  const lat = vertices.reduce((sum, v) => sum + v.latitude, 0) / vertices.length;
  const lng = vertices.reduce((sum, v) => sum + v.longitude, 0) / vertices.length;
  return { lat, lng };
}

export const MAX_SEARCH_RADIUS_METERS = 50_000; // Places nearby-search circle cap
const MIN_SEARCH_RADIUS_METERS = 50;

/** Smallest circle around the centroid that covers every ring vertex, so a
 *  single nearby-search can see the whole polygon (the polygon filter does
 *  the precise containment work afterwards). */
export function ringRadiusMeters(ring: Ring, center: LatLng): number {
  const vertices = uniqueRingVertices(ring);
  const max = Math.max(
    ...vertices.map((v) => haversineMeters(center, { lat: v.latitude, lng: v.longitude })),
  );
  return Math.min(Math.max(max, MIN_SEARCH_RADIUS_METERS), MAX_SEARCH_RADIUS_METERS);
}

// ---------------------------------------------------------------------------
// Category coverage: what is under-represented in a neighborhood
// ---------------------------------------------------------------------------

/** Categories a nearby-search makes sense for ('other' has no queryable
 *  Google type). Kept in sync with SPOT_CATEGORIES in queue/records.ts. */
export type SearchableCategory = Exclude<SpotCategory, 'other'>;

/** Google Places API (New) place types used for each category's search and
 *  for classifying a result's primaryType back into an app category. */
export const CATEGORY_PLACE_TYPES: Record<SearchableCategory, readonly string[]> = {
  cafe: ['cafe', 'coffee_shop'],
  restaurant: ['restaurant', 'meal_takeaway', 'meal_delivery'],
  bar: ['bar', 'pub'],
  park: ['park'],
  market: ['market', 'farmers_market', 'grocery_store'],
  museum: ['museum', 'art_gallery'],
  shop: ['store', 'book_store', 'clothing_store', 'home_goods_store', 'florist', 'jewelry_store', 'shoe_store'],
  landmark: ['historical_place', 'monument', 'tourist_attraction', 'place_of_worship'],
};

const CATEGORY_BY_PLACE_TYPE: ReadonlyMap<string, SearchableCategory> = new Map(
  (Object.entries(CATEGORY_PLACE_TYPES) as [SearchableCategory, readonly string[]][]).flatMap(
    ([category, types]) => types.map((type) => [type, category] as const),
  ),
);

export function categoryToPlaceTypes(category: SearchableCategory): string[] {
  return [...CATEGORY_PLACE_TYPES[category]];
}

/** A result's own primaryType, when it maps to one of our categories. */
export function placeTypeToCategory(type: string | undefined): SearchableCategory | undefined {
  if (!type) return undefined;
  return CATEGORY_BY_PLACE_TYPE.get(type);
}

export function zeroCategoryCounts(): Record<SpotCategory, number> {
  const counts = {} as Record<SpotCategory, number>;
  for (const category of SPOT_CATEGORIES) counts[category] = 0;
  return counts;
}

export function categoryCounts(spots: LocalSpot[]): Record<SpotCategory, number> {
  const counts = zeroCategoryCounts();
  for (const spot of spots) counts[spot.category] += 1;
  return counts;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** City-wide norm per category: the median count across the city's
 *  neighborhoods (neighborhoods with no spots count as 0 — they are part of
 *  the distribution). A category absent city-wide has median 0. */
export function cityCategoryMedians(perNeighborhoodSpots: LocalSpot[][]): Record<SpotCategory, number> {
  const medians = zeroCategoryCounts();
  for (const category of SPOT_CATEGORIES) {
    medians[category] = median(perNeighborhoodSpots.map((spots) => categoryCounts(spots)[category]));
  }
  return medians;
}

export interface CategoryGap {
  category: SearchableCategory;
  /** How many spots short of the half-median target this neighborhood is. */
  deficit: number;
  cityMedian: number;
  localCount: number;
}

/**
 * Categories where this neighborhood has fewer than half the city-wide median
 * count — the "under-represented" set. Categories absent city-wide (median 0)
 * are skipped: a category that exists nowhere in the city is a city-level
 * curation question, not a per-neighborhood gap, and would otherwise trigger
 * a search in every single neighborhood.
 */
export function selectUnderRepresentedCategories(
  counts: Record<SpotCategory, number>,
  medians: Record<SpotCategory, number>,
  limit: number,
): CategoryGap[] {
  const gaps: CategoryGap[] = [];
  for (const category of SPOT_CATEGORIES) {
    if (category === 'other') continue;
    const cityMedian = medians[category];
    if (cityMedian <= 0) continue;
    const deficit = Math.ceil(cityMedian / 2) - counts[category];
    if (deficit > 0) {
      gaps.push({ category, deficit, cityMedian, localCount: counts[category] });
    }
  }
  gaps.sort((a, b) => b.deficit - a.deficit || a.category.localeCompare(b.category));
  return gaps.slice(0, Math.max(0, limit));
}

// ---------------------------------------------------------------------------
// Dedupe: against curated spots and against earlier records of the same run
// ---------------------------------------------------------------------------

export function normalizePlaceName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const DUPLICATE_PROXIMITY_METERS = 100;

export interface DuplicateMatch {
  reason: 'placeId' | 'name-nearby';
  detail: string;
}

/**
 * Is this candidate the same real-world place as an existing curated spot?
 * Curated spots mostly lack placeIds, so the name + proximity path is the
 * load-bearing one; the placeId path future-proofs against promoted spots
 * (which always carry one).
 */
export function findCuratedDuplicate(place: ScoutPlace, curatedSpots: LocalSpot[]): DuplicateMatch | undefined {
  for (const spot of curatedSpots) {
    if (spot.placeId && spot.placeId === place.placeId) {
      return { reason: 'placeId', detail: `same placeId as curated spot '${spot.name}' (${spot.id})` };
    }
    const sameName = normalizePlaceName(spot.name) === normalizePlaceName(place.name);
    if (sameName && spot.location && haversineMeters(spot.location, place) < DUPLICATE_PROXIMITY_METERS) {
      return {
        reason: 'name-nearby',
        detail: `same name within ${DUPLICATE_PROXIMITY_METERS}m of curated spot '${spot.name}' (${spot.id})`,
      };
    }
  }
  return undefined;
}

/** Same check against records emitted earlier in this run — one real place
 *  reachable from two neighborhood polygons becomes exactly one proposal. */
export function isGloballyEmitted(place: ScoutPlace, records: SpotProposalRecord[]): DuplicateMatch | undefined {
  for (const record of records) {
    const proposed = record.proposedSpot;
    const at: LatLng = { lat: proposed.lat, lng: proposed.lng };
    if (proposed.googlePlaceId === place.placeId) {
      return { reason: 'placeId', detail: `already proposed as ${proposed.name}` };
    }
    if (normalizePlaceName(proposed.name) === normalizePlaceName(place.name) && haversineMeters(at, place) < DUPLICATE_PROXIMITY_METERS) {
      return { reason: 'name-nearby', detail: `already proposed as ${proposed.name}` };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Places client interface (the edge the CLI injects)
// ---------------------------------------------------------------------------

export interface ScoutPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  ratingCount?: number;
  primaryType?: string;
}

export interface NearbySearchRequest {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
}

export interface PlacesClient {
  readonly name: string;
  searchNearby(request: NearbySearchRequest): Promise<ScoutPlace[]>;
}

// ---------------------------------------------------------------------------
// Proposal records
// ---------------------------------------------------------------------------

export interface ProposalContext {
  gap: CategoryGap;
  neighborhoodId: string;
  neighborhoodName: string;
  checkedAt: string;
  placesStatus: string;
}

export function buildProposalRecord(place: ScoutPlace, context: ProposalContext): SpotProposalRecord {
  const ratingText =
    place.rating !== undefined
      ? `rated ${place.rating}${place.ratingCount !== undefined ? ` from ${place.ratingCount} reviews` : ''}`
      : 'no Places rating yet';
  const rationale =
    `${context.gap.category} is under-represented in ${context.neighborhoodName} ` +
    `(${context.gap.localCount} here vs city median of ${context.gap.cityMedian}); ` +
    `${ratingText}; place sits inside the neighborhood boundary`;

  const evidence: SpotProposalRecord['evidence'] = {
    insideNeighborhood: context.neighborhoodId,
    checkedAt: context.checkedAt,
    placesStatus: context.placesStatus,
  };
  if (place.rating !== undefined) evidence.rating = place.rating;
  if (place.ratingCount !== undefined) evidence.ratingCount = place.ratingCount;

  return {
    proposedSpot: {
      name: place.name,
      googlePlaceId: place.placeId,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      category: placeTypeToCategory(place.primaryType) ?? context.gap.category,
      rationale,
    },
    evidence,
    status: 'proposed',
  };
}

function rankCandidates(a: ScoutPlace, b: ScoutPlace): number {
  return (
    (b.ratingCount ?? -1) - (a.ratingCount ?? -1) ||
    (b.rating ?? -1) - (a.rating ?? -1) ||
    a.name.localeCompare(b.name)
  );
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface ScoutNeighborhood {
  id: string;
  cityId: string;
  name: string;
}

export interface ScoutNeighborhoodInput {
  neighborhood: ScoutNeighborhood;
  /** Polygon from src/data/boundaries; undefined when the neighborhood has none. */
  ring: Ring | undefined;
  /** Curated spots assigned to this neighborhood — the count basis for gaps. */
  spots: LocalSpot[];
}

export interface ScoutOptions {
  /** Max proposals kept per neighborhood per run. */
  maxPerNeighborhood: number;
  /** Max under-represented categories searched per neighborhood. */
  categoriesPerNeighborhood: number;
  /** Timestamp stamped into every record's evidence block. */
  checkedAt: string;
  /** placesStatus recorded on every record ('OK' live, 'FIXTURE' dry-run). */
  placesStatus: string;
  /** Hard cap on Places requests for the whole run. */
  maxRequests: number;
}

export interface ScoutInput {
  neighborhoods: ScoutNeighborhoodInput[];
  /** All curated spots across both cities — the dedupe reference. */
  curatedSpots: LocalSpot[];
  client: PlacesClient;
  options: ScoutOptions;
}

export type NeighborhoodOutcomeStatus =
  | 'proposed'
  | 'no-gaps'
  | 'no-new-spots'
  | 'no-boundary'
  | 'invalid-boundary'
  | 'budget-exhausted'
  | 'error';

export interface NeighborhoodOutcome {
  neighborhoodId: string;
  neighborhoodName: string;
  cityId: string;
  status: NeighborhoodOutcomeStatus;
  categoriesSearched: string[];
  proposals: number;
  detail?: string;
}

export interface ScoutOutput {
  records: SpotProposalRecord[];
  outcomes: NeighborhoodOutcome[];
  requestsUsed: number;
}

function outcome(
  entry: ScoutNeighborhoodInput,
  status: NeighborhoodOutcomeStatus,
  categoriesSearched: string[],
  proposals: number,
  detail?: string,
): NeighborhoodOutcome {
  return {
    neighborhoodId: entry.neighborhood.id,
    neighborhoodName: entry.neighborhood.name,
    cityId: entry.neighborhood.cityId,
    status,
    categoriesSearched,
    proposals,
    ...(detail !== undefined ? { detail } : {}),
  };
}

/**
 * Run the discovery pipeline over the given neighborhoods. Pure apart from
 * the injected client: same inputs (and a deterministic client) give the same
 * records — which is what makes the fixture-based dry-run a real proof.
 */
export async function runScout(input: ScoutInput): Promise<ScoutOutput> {
  const { neighborhoods, curatedSpots, client, options } = input;
  const medians = cityCategoryMedians(neighborhoods.map((entry) => entry.spots));
  const records: SpotProposalRecord[] = [];
  const outcomes: NeighborhoodOutcome[] = [];
  let requestsUsed = 0;

  for (const entry of neighborhoods) {
    if (requestsUsed >= options.maxRequests) {
      outcomes.push(outcome(entry, 'budget-exhausted', [], 0, `${options.maxRequests}-request cap reached`));
      continue;
    }
    if (!entry.ring) {
      outcomes.push(outcome(entry, 'no-boundary', [], 0, 'no polygon in src/data/boundaries'));
      continue;
    }
    if (!isValidRing(entry.ring)) {
      outcomes.push(outcome(entry, 'invalid-boundary', [], 0, 'fewer than 3 unique vertices'));
      continue;
    }
    const ring: Ring = entry.ring;

    const gaps = selectUnderRepresentedCategories(
      categoryCounts(entry.spots),
      medians,
      options.categoriesPerNeighborhood,
    );
    if (gaps.length === 0) {
      outcomes.push(outcome(entry, 'no-gaps', [], 0));
      continue;
    }

    const center = ringCentroid(ring);
    const radiusMeters = ringRadiusMeters(ring, center);
    const categoriesSearched: string[] = [];
    let quota = options.maxPerNeighborhood;
    let takenHere = 0;

    try {
      for (const gap of gaps) {
        if (quota <= 0 || requestsUsed >= options.maxRequests) break;
        const results = await client.searchNearby({
          lat: center.lat,
          lng: center.lng,
          radiusMeters,
          includedTypes: categoryToPlaceTypes(gap.category),
        });
        requestsUsed += 1;
        categoriesSearched.push(gap.category);

        const survivors = results
          .filter((place) => {
            if (!pointInRing(place, ring)) return false;
            if (findCuratedDuplicate(place, curatedSpots)) return false;
            if (isGloballyEmitted(place, records)) return false;
            return true;
          })
          .sort(rankCandidates);

        const taken = survivors
          .slice(0, quota)
          .map((place) =>
            buildProposalRecord(place, {
              gap,
              neighborhoodId: entry.neighborhood.id,
              neighborhoodName: entry.neighborhood.name,
              checkedAt: options.checkedAt,
              placesStatus: options.placesStatus,
            }),
          );
        records.push(...taken);
        quota -= taken.length;
        takenHere += taken.length;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      outcomes.push(outcome(entry, 'error', categoriesSearched, 0, detail));
      continue;
    }

    outcomes.push(
      outcome(entry, takenHere > 0 ? 'proposed' : 'no-new-spots', categoriesSearched, takenHere),
    );
  }

  return { records, outcomes, requestsUsed };
}
