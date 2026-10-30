// Deterministic fixture Places client for --dry-run. Stands in for
// places-client.ts with zero network access: for any query it returns a fixed
// spread of plausible results derived from the query itself (two near the
// centroid, one mid, one far outside any realistic polygon, one without
// rating data). This lets the whole real-data pipeline — category gaps,
// polygon filtering, dedupe, record building — run offline and prove itself
// while Google Maps billing is off (OQ1).
//
// Every fixture place is obviously synthetic ("Fixture Example …") and every
// record built from it carries placesStatus 'FIXTURE', which the promotion
// path refuses — a dry-run report can never enter src/data/.

import { createHash } from 'node:crypto';
import type { PlacesClient, NearbySearchRequest, ScoutPlace } from './scout-core';

function titleCase(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Stable per-query id salt so fixture placeIds differ per location+type —
 *  cross-neighborhood dedupe in a dry-run report therefore reflects real
 *  pipeline behavior, not accidental id reuse. */
function querySalt(request: NearbySearchRequest): string {
  const hash = createHash('sha256');
  hash.update(`${request.lat.toFixed(6)}|${request.lng.toFixed(6)}|${request.includedTypes.join(',')}`);
  return hash.digest('hex').slice(0, 10);
}

export function createFixturePlacesClient(): PlacesClient {
  return {
    name: 'fixture',
    async searchNearby(request: NearbySearchRequest): Promise<ScoutPlace[]> {
      const type = request.includedTypes[0] ?? 'establishment';
      const label = titleCase(type);
      const salt = querySalt(request);
      const base = { lat: request.lat, lng: request.lng };
      const offset = (dLat: number, dLng: number): { lat: number; lng: number } => ({
        lat: base.lat + dLat,
        lng: base.lng + dLng,
      });

      const fixtures: Array<{ dLat: number; dLng: number; rating?: number; ratingCount?: number }> = [
        { dLat: 0.0002, dLng: 0.0002, rating: 4.6, ratingCount: 310 },
        { dLat: -0.0002, dLng: -0.0002, rating: 4.2, ratingCount: 90 },
        { dLat: 0.003, dLng: 0.003, rating: 4.9, ratingCount: 1200 },
        { dLat: 0.05, dLng: 0.05 },
        { dLat: 0, dLng: 0 },
      ];

      return fixtures.map((fixture, index) => {
        const place: ScoutPlace = {
          placeId: `ChIJfixture-${salt}-${index + 1}`,
          name: `Fixture Example ${label} ${index + 1}`,
          address: `Fixture Address ${index + 1}, near ${request.lat.toFixed(4)}, ${request.lng.toFixed(4)}`,
          ...offset(fixture.dLat, fixture.dLng),
          primaryType: type,
        };
        if (fixture.rating !== undefined) {
          place.rating = fixture.rating;
          place.ratingCount = fixture.ratingCount;
        }
        return place;
      });
    },
  };
}
