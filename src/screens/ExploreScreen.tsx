import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSpots } from '../hooks/useLocalSpots';
import { useItinerary } from '../hooks/useItinerary';
import { CategoryChips } from '../components/explore/CategoryChips';
import { CuratedSection } from '../components/explore/CuratedSection';
import { NearbySection } from '../components/explore/NearbySection';
import { NeighborhoodExploreSummary } from '../components/explore/NeighborhoodExploreSummary';
import { getExploreSummary } from '../data/exploreSummaries';
import { ItineraryBar } from '../components/explore/ItineraryBar';
import { ItineraryView } from '../components/explore/ItineraryView';
import { getNeighborhoodCoordinates } from '../data/coordinates';
import { shareItinerary } from '../utils/sharing';
import { useItineraries } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import type { LocalSpot } from '../types';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Explore'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { neighborhood } = route.params;
  const [showItinerary, setShowItinerary] = useState(false);
  const { saveItinerary: persistItinerary } = useItineraries();
  const { showToast } = useToast();

  const {
    curatedSpots,
    nearbySpots,
    isLoading,
    selectedCategory,
    setSelectedCategory,
  } = useLocalSpots(neighborhood.id);

  const {
    stops,
    addStop,
    removeStop,
    clearItinerary,
    optimizeRoute,
    isInItinerary,
    totalWalkTime,
    totalDistance,
  } = useItinerary();

  const coords = getNeighborhoodCoordinates(neighborhood.id);
  const neighborhoodCoords = { lat: coords.latitude, lng: coords.longitude };
  const exploreSummary = getExploreSummary(neighborhood.id);

  const handleToggleItinerary = useCallback((spot: LocalSpot) => {
    if (isInItinerary(spot.id)) {
      removeStop(spot.id);
    } else {
      addStop(spot);
    }
  }, [isInItinerary, addStop, removeStop]);

  const handleShareItinerary = useCallback(() => {
    shareItinerary(
      {
        id: '',
        neighborhoodId: neighborhood.id,
        cityId: neighborhood.cityId,
        name: `${neighborhood.name} Day Out`,
        stops,
        totalWalkTime,
        totalDistance,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      neighborhood.name,
      neighborhood.id,
    );
  }, [neighborhood, stops, totalWalkTime, totalDistance]);

  const handleSaveItinerary = useCallback(() => {
    if (stops.length === 0) return;
    persistItinerary({
      id: `${neighborhood.id}-${Date.now()}`,
      neighborhoodId: neighborhood.id,
      cityId: neighborhood.cityId,
      name: `${neighborhood.name} Day Out`,
      stops,
      totalWalkTime,
      totalDistance,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    showToast('Itinerary saved', 'checkmark-circle');
  }, [neighborhood, stops, totalWalkTime, totalDistance, persistItinerary, showToast]);

  const handleClear = useCallback(() => {
    clearItinerary();
    setShowItinerary(false);
  }, [clearItinerary]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Explore {neighborhood.name}
          </Text>
          <Text style={styles.headerSubtitle}>{neighborhood.borough}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Category Filter */}
      <View style={styles.chipBar}>
        <CategoryChips
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Neighborhood Summary */}
        {exploreSummary && (
          <NeighborhoodExploreSummary summary={exploreSummary} />
        )}

        {/* Editor's Picks */}
        <CuratedSection
          spots={curatedSpots}
          onSpotPress={() => {}}
          isInItinerary={isInItinerary}
          onToggleItinerary={handleToggleItinerary}
        />

        {/* Nearby Places */}
        <NearbySection
          spots={nearbySpots}
          isLoading={isLoading}
          neighborhoodCoords={neighborhoodCoords}
          isInItinerary={isInItinerary}
          onToggleItinerary={handleToggleItinerary}
        />

        {/* Bottom spacing for itinerary bar */}
        <View style={{ height: stops.length > 0 ? 120 : SPACING.xxxl }} />
      </ScrollView>

      {/* Itinerary Bar */}
      <ItineraryBar
        stopCount={stops.length}
        totalWalkTime={totalWalkTime}
        onPress={() => setShowItinerary(true)}
      />

      {/* Itinerary Full View */}
      <ItineraryView
        visible={showItinerary}
        onClose={() => setShowItinerary(false)}
        stops={stops}
        totalWalkTime={totalWalkTime}
        totalDistance={totalDistance}
        neighborhoodName={neighborhood.name}
        onRemoveStop={removeStop}
        onOptimize={optimizeRoute}
        onShare={handleShareItinerary}
        onSave={handleSaveItinerary}
        onClear={handleClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  chipBar: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.lg,
  },
});
