import { TransportMode } from '../contexts/AppContext';

// Average speeds by transport mode in London (km/h)
const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  transit: 20,   // Tube/bus including stops and transfers
  walking: 5,    // Average walking pace
  cycling: 15,   // City cycling with traffic lights
  driving: 25,   // London traffic average
};

// Calculate distance in km between two coordinates
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Estimate commute time based on distance and transport mode
export const estimateCommuteTime = (distanceKm: number, transportMode: TransportMode = 'transit'): string => {
  const speed = TRANSPORT_SPEEDS[transportMode];
  const minutes = Math.round((distanceKm / speed) * 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

// Get transport mode display info
export const getTransportModeInfo = (mode: TransportMode): { icon: string; label: string } => {
  switch (mode) {
    case 'transit':
      return { icon: 'bus', label: 'Public Transit' };
    case 'walking':
      return { icon: 'walk', label: 'Walking' };
    case 'cycling':
      return { icon: 'bicycle', label: 'Cycling' };
    case 'driving':
      return { icon: 'car', label: 'Driving' };
  }
};
