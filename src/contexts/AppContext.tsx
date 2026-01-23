import React from 'react';
import {
  StatusComparisonProvider,
  useStatusComparison,
  NeighborhoodStatus,
} from './StatusComparisonContext';
import {
  NotesRatingsProvider,
  useNotesRatings,
} from './NotesRatingsContext';
import {
  DestinationsProvider,
  useDestinations,
  Destination,
  TransportMode,
} from './DestinationsContext';
import {
  CityProvider,
  useCity,
} from './CityContext';

// Re-export types for backward compatibility
export type { NeighborhoodStatus } from './StatusComparisonContext';
export type { Destination, TransportMode } from './DestinationsContext';

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

/**
 * Combined useApp hook for backward compatibility.
 * Components can still use useApp() to get all context values.
 *
 * For better performance, prefer using the specific hooks:
 * - useStatusComparison() - for status and comparison
 * - useNotesRatings() - for notes, photos, and ratings
 * - useDestinations() - for destinations
 */
export function useApp() {
  const statusComparison = useStatusComparison();
  const notesRatings = useNotesRatings();
  const destinations = useDestinations();

  return {
    // Status & Comparison
    status: statusComparison.status,
    setNeighborhoodStatus: statusComparison.setNeighborhoodStatus,
    getNeighborhoodsByStatus: statusComparison.getNeighborhoodsByStatus,
    comparison: statusComparison.comparison,
    toggleComparison: statusComparison.toggleComparison,
    isInComparison: statusComparison.isInComparison,
    clearComparison: statusComparison.clearComparison,

    // Notes, Photos & Ratings
    notes: notesRatings.notes,
    setNeighborhoodNote: notesRatings.setNeighborhoodNote,
    photos: notesRatings.photos,
    addNeighborhoodPhoto: notesRatings.addNeighborhoodPhoto,
    removeNeighborhoodPhoto: notesRatings.removeNeighborhoodPhoto,
    userRatings: notesRatings.userRatings,
    setUserRating: notesRatings.setUserRating,

    // Destinations (city-filtered)
    destinations: destinations.cityDestinations,
    addDestination: destinations.addDestination,
    removeDestination: destinations.removeDestination,
    updateDestination: destinations.updateDestination,
  };
}

// Export individual hooks for optimized usage
export { useStatusComparison } from './StatusComparisonContext';
export { useNotesRatings } from './NotesRatingsContext';
export { useDestinations } from './DestinationsContext';
export { useCity } from './CityContext';
