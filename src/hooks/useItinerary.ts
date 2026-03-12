import { useState, useCallback, useMemo } from 'react';
import type { LocalSpot, ItineraryStop } from '../types';
import { calculateDistance } from '../utils/commute';

interface UseItineraryReturn {
  stops: ItineraryStop[];
  addStop: (spot: LocalSpot) => void;
  removeStop: (spotId: string) => void;
  clearItinerary: () => void;
  optimizeRoute: () => void;
  isInItinerary: (spotId: string) => boolean;
  totalWalkTime: string;
  totalDistance: number;
}

const WALKING_SPEED_KMH = 5;
const WALKING_DETOUR_FACTOR = 1.3; // streets aren't straight lines

function computeWalkTime(distanceKm: number): string {
  const minutes = Math.round((distanceKm * WALKING_DETOUR_FACTOR / WALKING_SPEED_KMH) * 60);
  if (minutes < 1) return '< 1 min';
  return `~${minutes} min`;
}

function computeStopsWithTimes(spots: LocalSpot[]): ItineraryStop[] {
  return spots.map((spot, index) => {
    let walkTimeFromPrevious: string | undefined;
    let distanceFromPrevious: number | undefined;

    if (index > 0) {
      const prev = spots[index - 1];
      distanceFromPrevious = calculateDistance(
        prev.location.lat, prev.location.lng,
        spot.location.lat, spot.location.lng,
      );
      walkTimeFromPrevious = computeWalkTime(distanceFromPrevious);
    }

    return {
      spot,
      order: index,
      walkTimeFromPrevious,
      distanceFromPrevious,
    };
  });
}

// Nearest-neighbor greedy sort for simple route optimization
function nearestNeighborSort(spots: LocalSpot[]): LocalSpot[] {
  if (spots.length <= 2) return [...spots];

  const remaining = [...spots];
  const sorted: LocalSpot[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(
        last.location.lat, last.location.lng,
        remaining[i].location.lat, remaining[i].location.lng,
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    sorted.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return sorted;
}

export function useItinerary(): UseItineraryReturn {
  const [spots, setSpots] = useState<LocalSpot[]>([]);

  const stops = useMemo(() => computeStopsWithTimes(spots), [spots]);

  const totalDistance = useMemo(() => {
    return stops.reduce((sum, stop) => sum + (stop.distanceFromPrevious || 0), 0);
  }, [stops]);

  const totalWalkTime = useMemo(() => {
    const minutes = Math.round((totalDistance * WALKING_DETOUR_FACTOR / WALKING_SPEED_KMH) * 60);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `~${hours}h ${remainingMins}m` : `~${hours}h`;
  }, [totalDistance]);

  const addStop = useCallback((spot: LocalSpot) => {
    setSpots((prev) => {
      if (prev.some((s) => s.id === spot.id)) return prev;
      return [...prev, spot];
    });
  }, []);

  const removeStop = useCallback((spotId: string) => {
    setSpots((prev) => prev.filter((s) => s.id !== spotId));
  }, []);

  const clearItinerary = useCallback(() => {
    setSpots([]);
  }, []);

  const optimizeRoute = useCallback(() => {
    setSpots((prev) => nearestNeighborSort(prev));
  }, []);

  const spotIdSet = useMemo(
    () => new Set(spots.map((s) => s.id)),
    [spots],
  );

  const isInItinerary = useCallback((spotId: string) => {
    return spotIdSet.has(spotId);
  }, [spotIdSet]);

  return {
    stops,
    addStop,
    removeStop,
    clearItinerary,
    optimizeRoute,
    isInItinerary,
    totalWalkTime,
    totalDistance,
  };
}
