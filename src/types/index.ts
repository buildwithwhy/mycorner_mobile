// Shared Domain Types
// Canonical definitions for types used across multiple modules

// ============================================================================
// NEIGHBORHOOD STATUS
// ============================================================================

export type NeighborhoodStatus =
  | 'shortlist'
  | 'want_to_visit'
  | 'visited'
  | 'living_here'
  | 'ruled_out'
  | null;

export interface ToggleComparisonResult {
  success: boolean;
  action: 'added' | 'removed' | 'limit_reached';
}

// ============================================================================
// DESTINATIONS
// ============================================================================

export type TransportMode = 'transit' | 'walking' | 'cycling' | 'driving';

export interface Destination {
  id: string;
  cityId: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transportMode: TransportMode;
}

// ============================================================================
// USER RATINGS
// ============================================================================

export type UserRatings = Record<
  string,
  Partial<{
    affordability: number;
    safety: number;
    transit: number;
    greenSpace: number;
    nightlife: number;
    familyFriendly: number;
    dining: number;
    vibe: number;
  }>
>;

// ============================================================================
// DATABASE ROW TYPES (snake_case, matching Supabase schema)
// ============================================================================

export interface NeighborhoodStatusRow {
  neighborhood_id: string;
  status: string;
}

export interface NeighborhoodNoteRow {
  neighborhood_id: string;
  note: string;
}

export interface NeighborhoodRatingRow {
  neighborhood_id: string;
  affordability: number | null;
  safety: number | null;
  transit: number | null;
  green_space: number | null;
  nightlife: number | null;
  family_friendly: number | null;
}

export interface DestinationRow {
  id: string;
  city_id?: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transport_mode?: string;
}

// ============================================================================
// LOCAL SPOTS
// ============================================================================

export type SpotCategory =
  | 'cafe'
  | 'restaurant'
  | 'bar'
  | 'park'
  | 'market'
  | 'museum'
  | 'shop'
  | 'landmark'
  | 'other';

export type SpotSource = 'curated' | 'google_places';

export interface LocalSpot {
  id: string;
  neighborhoodId: string;
  name: string;
  category: SpotCategory;
  description?: string;
  address?: string;
  location: { lat: number; lng: number };
  rating?: number;
  priceLevel?: number;
  source: SpotSource;
  placeId?: string;
  editorial?: string;
  tags?: string[];
}

// ============================================================================
// ITINERARIES
// ============================================================================

export interface ItineraryStop {
  spot: LocalSpot;
  order: number;
  walkTimeFromPrevious?: string;
  distanceFromPrevious?: number;
}

export interface Itinerary {
  id: string;
  neighborhoodId: string;
  cityId: string;
  name: string;
  stops: ItineraryStop[];
  totalWalkTime?: string;
  totalDistance?: number;
  createdAt: number;
  updatedAt: number;
}
