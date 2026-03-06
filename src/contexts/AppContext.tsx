import React from 'react';
import {
  StatusComparisonProvider,
  useStatusComparison,
} from './StatusComparisonContext';
import {
  NotesRatingsProvider,
  useNotesRatings,
} from './NotesRatingsContext';
import {
  DestinationsProvider,
  useDestinations,
} from './DestinationsContext';
import {
  CityProvider,
  useCity,
} from './CityContext';

// Re-export types for backward compatibility
export type { NeighborhoodStatus, Destination, TransportMode } from '../types';

/**
 * Combined AppProvider that wraps all context providers.
 * This allows existing code to continue using a single provider.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <CityProvider>
      <StatusComparisonProvider>
        <NotesRatingsProvider>
          <DestinationsProvider>
            {children}
          </DestinationsProvider>
        </NotesRatingsProvider>
      </StatusComparisonProvider>
    </CityProvider>
  );
}

// Export individual hooks for optimized usage
export { useStatusComparison } from './StatusComparisonContext';
export { useNotesRatings } from './NotesRatingsContext';
export { useDestinations } from './DestinationsContext';
export { useCity } from './CityContext';
