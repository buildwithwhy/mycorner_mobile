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
  steps: any[];
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
