import type { LocalSpot } from '../../types';
import { londonCuratedSpots } from './london';
import { newYorkCuratedSpots } from './new-york';

const spotsByNeighborhood = new Map<string, LocalSpot[]>();

for (const spot of londonCuratedSpots) {
  const list = spotsByNeighborhood.get(spot.neighborhoodId);
  if (list) {
    list.push(spot);
  } else {
    spotsByNeighborhood.set(spot.neighborhoodId, [spot]);
  }
}

for (const spot of newYorkCuratedSpots) {
  const list = spotsByNeighborhood.get(spot.neighborhoodId);
  if (list) {
    list.push(spot);
  } else {
    spotsByNeighborhood.set(spot.neighborhoodId, [spot]);
  }
}

const EMPTY: LocalSpot[] = [];

export const getCuratedSpots = (neighborhoodId: string): LocalSpot[] => {
  return spotsByNeighborhood.get(neighborhoodId) ?? EMPTY;
};


