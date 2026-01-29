export type DiningStyle = 'traditional' | 'diverse' | 'trendy' | 'limited';
export type NeighborhoodVibe = 'happening' | 'moderate' | 'quiet';

export interface Neighborhood {
  id: string;
  cityId: string;
  name: string;
  borough: string;
  affordability: number; // 1-5 (1 = expensive, 5 = affordable)
  safety: number; // 1-5
  transit: number; // 1-5
  greenSpace: number; // 1-5
  nightlife: number; // 1-5
  familyFriendly: number; // 1-5
  dining: number; // 1-5 (overall dining scene quality)
  diningStyle: DiningStyle; // Type of dining scene
  vibe: NeighborhoodVibe; // How lively/eventful the area is
  description: string;
  highlights: string[];
}

import { londonNeighborhoods } from './london';
import { newYorkNeighborhoods } from './new-york';

// Combined array of all neighborhoods
export const neighborhoods: Neighborhood[] = [
  ...londonNeighborhoods,
  ...newYorkNeighborhoods,
];

// Get neighborhoods filtered by city
export const getNeighborhoodsByCity = (cityId: string): Neighborhood[] => {
  return neighborhoods.filter((n) => n.cityId === cityId);
};

// Get a neighborhood by ID
export const getNeighborhoodById = (id: string): Neighborhood | undefined => {
  return neighborhoods.find((n) => n.id === id);
};

// Re-export city-specific arrays for direct access if needed
export { londonNeighborhoods } from './london';
export { newYorkNeighborhoods } from './new-york';
