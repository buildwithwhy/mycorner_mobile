import type { NeighborhoodEvent } from '../../types/community';
import { londonEvents } from './london';
import { newYorkEvents } from './new-york';

const eventsByNeighborhood = new Map<string, NeighborhoodEvent[]>();

for (const event of [...londonEvents, ...newYorkEvents]) {
  const list = eventsByNeighborhood.get(event.neighborhoodId);
  if (list) {
    list.push(event);
  } else {
    eventsByNeighborhood.set(event.neighborhoodId, [event]);
  }
}

const EMPTY: NeighborhoodEvent[] = [];

export const getEvents = (neighborhoodId: string): NeighborhoodEvent[] => {
  return eventsByNeighborhood.get(neighborhoodId) ?? EMPTY;
};
