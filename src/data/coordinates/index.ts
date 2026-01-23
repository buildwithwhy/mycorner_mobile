import { londonCoordinates, LONDON_DEFAULT_COORDS } from './london';
import { newYorkCoordinates, NYC_DEFAULT_COORDS } from './new-york';
import { getCityById } from '../cities';

// Combined coordinates for all neighborhoods
export const neighborhoodCoordinates: Record<string, { latitude: number; longitude: number }> = {
  ...londonCoordinates,
  ...newYorkCoordinates,
};

// Get coordinates for a neighborhood, with fallback to city center
export const getNeighborhoodCoordinates = (id: string): { latitude: number; longitude: number } => {
  const coords = neighborhoodCoordinates[id];
  if (coords) {
    return coords;
  }

  // Fallback: determine city from ID prefix and return city center
  if (id.startsWith('ny-')) {
    return NYC_DEFAULT_COORDS;
  }
  return LONDON_DEFAULT_COORDS;
};

// Get default coordinates for a city
export const getCityDefaultCoordinates = (cityId: string): { latitude: number; longitude: number } => {
  const city = getCityById(cityId);
  if (city) {
    return { latitude: city.region.latitude, longitude: city.region.longitude };
  }
  return LONDON_DEFAULT_COORDS;
};

// Re-export for direct access if needed
export { londonCoordinates, LONDON_DEFAULT_COORDS } from './london';
export { newYorkCoordinates, NYC_DEFAULT_COORDS } from './new-york';
