export type DiningStyle = 'traditional' | 'diverse' | 'trendy' | 'limited';
export type NeighborhoodVibe = 'happening' | 'moderate' | 'quiet';

export interface Neighborhood {
  id: string;
  cityId: string;
  name: string;
  borough: string;
  parentId?: string; // Optional: ID of parent neighborhood (for sub-neighborhoods)
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

// Source attribution for each rating metric, per city
// 'official' = based on real public data, 'editorial' = curated estimate
export interface MetricSource {
  short: string; // e.g. "Met Police data"
  long: string;  // e.g. "Based on Met Police borough crime rates (2024)"
  type: 'official' | 'editorial';
}

const EDITORIAL: MetricSource = {
  short: 'Editorial est.',
  long: 'Editorial estimate — not based on official data',
  type: 'editorial',
};

export const METRIC_SOURCES: Record<string, Record<string, MetricSource>> = {
  london: {
    safety: {
      short: 'Met Police data',
      long: 'Based on Met Police borough crime rates (2024)',
      type: 'official',
    },
    transit: EDITORIAL,
    greenSpace: EDITORIAL,
    nightlife: EDITORIAL,
    familyFriendly: EDITORIAL,
    dining: EDITORIAL,
    vibe: EDITORIAL,
  },
  'new-york': {
    safety: {
      short: 'NYPD data',
      long: 'Based on NYPD precinct crime data (2024)',
      type: 'official',
    },
    transit: {
      short: 'Walk Score',
      long: 'Based on Walk Score transit data',
      type: 'official',
    },
    greenSpace: EDITORIAL,
    nightlife: EDITORIAL,
    familyFriendly: EDITORIAL,
    dining: EDITORIAL,
    vibe: EDITORIAL,
  },
};
