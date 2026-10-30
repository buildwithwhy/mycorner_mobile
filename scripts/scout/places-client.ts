// Live Google Places client (Places API New, searchNearby) for the discovery
// scout. Used only for real runs: requires a server-restricted API key with
// billing enabled (owner action, OQ1 — see CURATED_DATA_AUDIT.md for the
// REQUEST_DENIED history). The fixture client in fixture-places.ts stands in
// for this module in --dry-run; run-scout.ts never imports this file in
// dry-run mode.

import type { PlacesClient, NearbySearchRequest, ScoutPlace } from './scout-core';

const API_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.location',
  'places.primaryType',
].join(',');
const REQUEST_TIMEOUT_MS = 15_000;

interface PlacesApiResponse {
  places?: unknown;
  error?: { message?: string; status?: string };
}

/** Narrow one Places result into a ScoutPlace, or undefined when it lacks a
 *  required field (id, name, or location) — those records cannot be proposed. */
function parsePlace(raw: unknown): ScoutPlace | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const place = raw as Record<string, unknown>;

  const placeId = typeof place.id === 'string' ? place.id : undefined;
  const displayName =
    typeof place.displayName === 'object' &&
    place.displayName !== null &&
    typeof (place.displayName as Record<string, unknown>).text === 'string'
      ? ((place.displayName as Record<string, unknown>).text as string)
      : undefined;
  const location =
    typeof place.location === 'object' && place.location !== null
      ? (place.location as Record<string, unknown>)
      : undefined;
  const lat = location ? location.latitude : undefined;
  const lng = location ? location.longitude : undefined;

  if (!placeId || !displayName || typeof lat !== 'number' || typeof lng !== 'number') return undefined;

  const parsed: ScoutPlace = {
    placeId,
    name: displayName,
    address: typeof place.formattedAddress === 'string' ? place.formattedAddress : '',
    lat,
    lng,
  };
  if (typeof place.rating === 'number') parsed.rating = place.rating;
  if (typeof place.userRatingCount === 'number') parsed.ratingCount = place.userRatingCount;
  if (typeof place.primaryType === 'string') parsed.primaryType = place.primaryType;
  return parsed;
}

export function createGooglePlacesClient(apiKey: string): PlacesClient {
  return {
    name: 'google-places',
    async searchNearby(request: NearbySearchRequest): Promise<ScoutPlace[]> {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          includedTypes: request.includedTypes,
          maxResultCount: 20,
          rankPreference: 'POPULARITY',
          locationRestriction: {
            circle: {
              center: { latitude: request.lat, longitude: request.lng },
              radius: Math.round(request.radiusMeters),
            },
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body = (await response.json().catch(() => ({}))) as PlacesApiResponse;
      if (!response.ok) {
        const message = body.error?.message ?? response.statusText;
        const status = body.error?.status ?? String(response.status);
        throw new Error(`Places API ${status}: ${message}`);
      }

      const places = Array.isArray(body.places) ? body.places : [];
      return places.map(parsePlace).filter((place): place is ScoutPlace => place !== undefined);
    },
  };
}
