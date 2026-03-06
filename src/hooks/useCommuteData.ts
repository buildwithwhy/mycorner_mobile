import { useMemo } from 'react';
import type { Destination, TransportMode } from '../types';
import { calculateDistance, estimateCommuteTime, getTransportModeInfo } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { DESTINATION_COLORS } from '../constants/theme';

export interface CommuteItem {
  destinationId: string;
  label: string;
  address: string;
  distance: number;
  time: string;
  transportMode: TransportMode;
  modeIcon: string;
  modeLabel: string;
  color: string;
}

export function useCommuteData(
  neighborhoodId: string,
  destinations: Destination[],
): CommuteItem[] {
  return useMemo(() => {
    if (!neighborhoodId || destinations.length === 0) return [];

    const coords = getNeighborhoodCoordinates(neighborhoodId);

    return destinations.map((destination, index) => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        destination.latitude,
        destination.longitude,
      );
      const transportMode = destination.transportMode || 'transit';
      const time = estimateCommuteTime(distance, transportMode);
      const modeInfo = getTransportModeInfo(transportMode);

      return {
        destinationId: destination.id,
        label: destination.label,
        address: destination.address,
        distance,
        time,
        transportMode,
        modeIcon: modeInfo.icon,
        modeLabel: modeInfo.label,
        color: DESTINATION_COLORS[index % DESTINATION_COLORS.length],
      };
    });
  }, [neighborhoodId, destinations]);
}
