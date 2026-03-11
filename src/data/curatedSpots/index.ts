import type { LocalSpot } from '../../types';
import { londonCuratedSpots } from './london';
import { newYorkCuratedSpots } from './new-york';

const allCuratedSpots: LocalSpot[] = [
  ...londonCuratedSpots,
  ...newYorkCuratedSpots,
];

export const getCuratedSpots = (neighborhoodId: string): LocalSpot[] => {
  return allCuratedSpots.filter((s) => s.neighborhoodId === neighborhoodId);
};

export { londonCuratedSpots, newYorkCuratedSpots };
