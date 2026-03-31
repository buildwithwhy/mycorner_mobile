import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocalSpot } from '../../types';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { SpotCard } from './SpotCard';
import { SpotCardSkeleton } from './SpotCardSkeleton';

interface NearbySectionProps {
  spots: LocalSpot[];
  isLoading: boolean;
  error?: string | null;
  neighborhoodCoords: { lat: number; lng: number };
  isInItinerary: (spotId: string) => boolean;
  onToggleItinerary: (spot: LocalSpot) => void;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
}

function NearbySectionComponent({
  spots,
  isLoading,
  error,
  neighborhoodCoords,
  isInItinerary,
  onToggleItinerary,
}: NearbySectionProps) {
  const renderSpot = useCallback(
    (spot: LocalSpot) => {
      const distanceKm = calculateDistanceKm(
        neighborhoodCoords.lat,
        neighborhoodCoords.lng,
        spot.location.lat,
        spot.location.lng
      );
      const inItinerary = isInItinerary(spot.id);

      return (
        <SpotCard
          key={spot.id}
          spot={spot}
          distanceKm={distanceKm}
          isInItinerary={inItinerary}
          onAddToItinerary={() => onToggleItinerary(spot)}
          onRemoveFromItinerary={() => onToggleItinerary(spot)}
        />
      );
    },
    [neighborhoodCoords, isInItinerary, onToggleItinerary]
  );

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="compass-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Nearby Places</Text>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View>
          <SpotCardSkeleton />
          <SpotCardSkeleton />
          <SpotCardSkeleton />
        </View>
      )}

      {/* Spot List */}
      {!isLoading && spots.length > 0 && (
        <View>{spots.map(renderSpot)}</View>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.gray400} />
          <Text style={styles.emptyText}>Couldn't load nearby places</Text>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && spots.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={32} color={COLORS.gray400} />
          <Text style={styles.emptyText}>No places found nearby</Text>
        </View>
      )}
    </View>
  );
}

export const NearbySection = React.memo(NearbySectionComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },
});
