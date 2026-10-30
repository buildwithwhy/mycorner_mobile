import type { BusinessShowcase } from '../../types/community';
import { londonShowcases } from './london';
import { newYorkShowcases } from './new-york';

const showcasesByNeighborhood = new Map<string, BusinessShowcase[]>();

for (const showcase of [...londonShowcases, ...newYorkShowcases]) {
  const list = showcasesByNeighborhood.get(showcase.neighborhoodId);
  if (list) {
    list.push(showcase);
  } else {
    showcasesByNeighborhood.set(showcase.neighborhoodId, [showcase]);
  }
}

const EMPTY: BusinessShowcase[] = [];

export const getShowcases = (neighborhoodId: string): BusinessShowcase[] => {
  return showcasesByNeighborhood.get(neighborhoodId) ?? EMPTY;
};
