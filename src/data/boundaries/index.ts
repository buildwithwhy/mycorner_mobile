import { londonBoundaries } from './london';
import { newYorkBoundaries } from './new-york';

const boundariesByCity: Record<string, Record<string, { latitude: number; longitude: number }[]>> = {
  london: londonBoundaries,
  'new-york': newYorkBoundaries,
};

export const getNeighborhoodBoundary = (
  neighborhoodId: string,
  cityId: string,
): { latitude: number; longitude: number }[] | undefined => {
  return boundariesByCity[cityId]?.[neighborhoodId];
};
