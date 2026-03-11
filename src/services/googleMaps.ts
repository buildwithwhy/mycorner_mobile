// Google Maps API Service
// Centralized service for all Google Maps Platform API calls

import { GOOGLE_MAPS_API_KEY } from '../../config';
import logger from '../utils/logger';

/**
 * Geocoding Service - Convert addresses to coordinates
 */
export const geocodeAddress = async (address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
} | null> => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    logger.error('Geocoding failed:', data.status);
    return null;
  } catch (error) {
    logger.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Reverse Geocoding Service - Convert coordinates to address
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    logger.error('Reverse geocoding failed:', data.status);
    return null;
  } catch (error) {
    logger.error('Error reverse geocoding:', error);
    return null;
  }
};

/**
 * Places Autocomplete Predictions
 * Note: This is primarily used by react-native-google-places-autocomplete
 * but this function provides a programmatic way to fetch predictions if needed
 */
export const getPlacePredictions = async (
  input: string,
  options?: {
    location?: { lat: number; lng: number };
    radius?: number;
    types?: string[];
    components?: string; // e.g., 'country:gb'
  }
): Promise<any[]> => {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}`;

    if (options?.location) {
      url += `&location=${options.location.lat},${options.location.lng}`;
    }
    if (options?.radius) {
      url += `&radius=${options.radius}`;
    }
    if (options?.types && options.types.length > 0) {
      url += `&types=${options.types.join('|')}`;
    }
    if (options?.components) {
      url += `&components=${options.components}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.predictions;
    }

    logger.error('Places autocomplete failed:', data.status);
    return [];
  } catch (error) {
    logger.error('Error fetching place predictions:', error);
    return [];
  }
};

/**
 * Get Place Details by Place ID
 */
export const getPlaceDetails = async (placeId: string): Promise<{
  name: string;
  address: string;
  location: { lat: number; lng: number };
  placeId: string;
} | null> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      const result = data.result;
      return {
        name: result.name,
        address: result.formatted_address,
        location: result.geometry.location,
        placeId: result.place_id,
      };
    }

    logger.error('Place details fetch failed:', data.status);
    return null;
  } catch (error) {
    logger.error('Error fetching place details:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * This is a utility function that doesn't require API calls
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Google Place type to app SpotCategory mapping
 */
const GOOGLE_TYPE_TO_CATEGORY: Record<string, import('../types').SpotCategory> = {
  cafe: 'cafe',
  bakery: 'cafe',
  restaurant: 'restaurant',
  meal_delivery: 'restaurant',
  meal_takeaway: 'restaurant',
  bar: 'bar',
  night_club: 'bar',
  park: 'park',
  museum: 'museum',
  art_gallery: 'museum',
  shopping_mall: 'shop',
  store: 'shop',
  book_store: 'shop',
  clothing_store: 'shop',
  tourist_attraction: 'landmark',
  church: 'landmark',
  city_hall: 'landmark',
  library: 'landmark',
};

const mapGoogleTypeToCategory = (types: string[]): import('../types').SpotCategory => {
  for (const type of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) {
      return GOOGLE_TYPE_TO_CATEGORY[type];
    }
  }
  return 'other';
};

/**
 * Google Place types to exclude from Explore results.
 * These are irrelevant for local day trips and neighborhood exploration.
 */
const EXCLUDED_TYPES = new Set([
  'lodging',
  'hotel',
  'motel',
  'resort_hotel',
  'real_estate_agency',
  'travel_agency',
  'insurance_agency',
  'car_dealer',
  'car_rental',
  'car_repair',
  'car_wash',
  'gas_station',
  'parking',
  'atm',
  'bank',
  'dentist',
  'doctor',
  'hospital',
  'pharmacy',
  'physiotherapist',
  'veterinary_care',
  'lawyer',
  'accounting',
  'funeral_home',
  'storage',
  'moving_company',
  'locksmith',
  'electrician',
  'plumber',
  'roofing_contractor',
]);

/**
 * Generic place names to filter out (city names, boroughs, etc.)
 * These appear because the Nearby Search returns the locality itself as a result.
 */
const GENERIC_NAME_PATTERNS = [
  // Major cities
  /^london$/i,
  /^new york$/i,
  /^new york city$/i,
  /^manhattan$/i,
  /^brooklyn$/i,
  // Common generic results
  /^city of /i,
  /^borough of /i,
  /^london borough of /i,
];

const isExcludedPlace = (place: { name: string; types: string[] }): boolean => {
  // Exclude if any type matches the excluded set
  if (place.types.some((t) => EXCLUDED_TYPES.has(t))) return true;

  // Exclude if name matches a generic/city pattern
  if (GENERIC_NAME_PATTERNS.some((pattern) => pattern.test(place.name))) return true;

  // Exclude purely administrative results (no useful category)
  const adminOnlyTypes = ['locality', 'political', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
  if (place.types.length > 0 && place.types.every((t) => adminOnlyTypes.includes(t) || t === 'point_of_interest' || t === 'establishment')) {
    // Has ONLY admin/generic types — likely a city/area result, not a real business
    if (place.types.every((t) => adminOnlyTypes.includes(t))) return true;
  }

  return false;
};

/**
 * Nearby Search - Find places near a location
 * Uses the Places Nearby Search API (same API key as autocomplete/details)
 */
export type NearbyPlaceType =
  | 'cafe' | 'restaurant' | 'bar' | 'park' | 'museum'
  | 'shopping_mall' | 'tourist_attraction'
  | 'night_club' | 'bakery' | 'book_store';

export interface NearbyPlaceResult {
  id: string;
  placeId: string;
  name: string;
  category: import('../types').SpotCategory;
  location: { lat: number; lng: number };
  address?: string;
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  types: string[];
}

export const searchNearbyPlaces = async (
  location: { lat: number; lng: number },
  options?: {
    radius?: number;
    type?: NearbyPlaceType;
    keyword?: string;
    maxResults?: number;
  }
): Promise<NearbyPlaceResult[]> => {
  try {
    const radius = options?.radius ?? 800;
    const maxResults = options?.maxResults ?? 10;

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&key=${GOOGLE_MAPS_API_KEY}`;

    if (options?.type) {
      url += `&type=${options.type}`;
    }
    if (options?.keyword) {
      url += `&keyword=${encodeURIComponent(options.keyword)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      const filtered = data.results.filter(
        (place: any) => !isExcludedPlace({ name: place.name, types: place.types || [] })
      );

      return filtered.slice(0, maxResults).map((place: any) => ({
        id: place.place_id,
        placeId: place.place_id,
        name: place.name,
        category: mapGoogleTypeToCategory(place.types || []),
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        address: place.vicinity,
        rating: place.rating,
        priceLevel: place.price_level,
        openNow: place.opening_hours?.open_now,
        types: place.types || [],
      }));
    }

    if (data.status !== 'ZERO_RESULTS') {
      logger.error('Nearby search failed:', data.status);
    }
    return [];
  } catch (error) {
    logger.error('Error searching nearby places:', error);
    return [];
  }
};

/**
 * Get Directions between two locations
 * Returns route information including duration and distance
 */
export const getDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'transit'
): Promise<{
  distance: string;
  duration: string;
  steps: Array<{ html_instructions: string; distance: { text: string }; duration: { text: string } }>;
} | null> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps,
      };
    }

    logger.error('Directions fetch failed:', data.status);
    return null;
  } catch (error) {
    logger.error('Error fetching directions:', error);
    return null;
  }
};
