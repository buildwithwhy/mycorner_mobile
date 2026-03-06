import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Neighborhood } from '../data/neighborhoods';
import { useStatusComparison, useCity, useNotesRatings, NeighborhoodStatus } from '../contexts/AppContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import NeighborhoodCard, { ViewMode } from '../components/NeighborhoodCard';
import SignInPromptModal from '../components/SignInPromptModal';
import StatusPickerModal from '../components/StatusPickerModal';
import FilterModal from '../components/FilterModal';
import SortModal, { SortOption } from '../components/SortModal';
import MatchModal from '../components/MatchModal';
import { CityHeaderSelector, CitySelectorModal } from '../components/CitySelector';
import { ScoredNeighborhood } from '../utils/personalizedScoring';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useFilteredNeighborhoods } from '../hooks/useFilteredNeighborhoods';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { requireAuth, showSignInModal, dismissSignInModal } = useRequireAuth();
  const { status, setNeighborhoodStatus, comparison, toggleComparison, comparisonLimit } = useStatusComparison();
  const { cityNeighborhoods, showCityPicker, hasSelectedCity, selectedCity } = useCity();
  const { photos } = useNotesRatings();
  const { preferences, hasCustomPreferences } = usePreferences();
  const { canAccess, requiresUpgrade } = useFeatureAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCitySelectorModal, setShowCitySelectorModal] = useState(false);
  const [minAffordability, setMinAffordability] = useState(1);
  const [minSafety, setMinSafety] = useState(1);
  const [minTransit, setMinTransit] = useState(1);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Lifted modal state - single instance for all cards
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null);

  // Get selected neighborhood for modal
  const selectedNeighborhood = useMemo(() =>
    selectedNeighborhoodId ? cityNeighborhoods.find(n => n.id === selectedNeighborhoodId) : null,
    [selectedNeighborhoodId, cityNeighborhoods]
  );

  // Handler for "Add to Places" - checks auth and shows appropriate modal
  const handleAddToPlaces = useCallback((neighborhoodId: string) => {
    setSelectedNeighborhoodId(neighborhoodId);
    requireAuth('saving places', () => setShowStatusPicker(true));
  }, [requireAuth]);

  // Handler for status selection
  const handleSetStatus = useCallback((newStatus: NeighborhoodStatus) => {
    if (selectedNeighborhoodId) {
      setNeighborhoodStatus(selectedNeighborhoodId, newStatus);
    }
    setShowStatusPicker(false);
    setSelectedNeighborhoodId(null);
  }, [selectedNeighborhoodId, setNeighborhoodStatus]);

  // Auto-switch to "Best Match" sort when premium user has custom preferences
  useEffect(() => {
    if (hasCustomPreferences && sortBy === 'name' && canAccess('personalized_scores')) {
      setSortBy('bestMatch');
    }
    // Reset to 'name' if non-premium user somehow has bestMatch selected
    if (sortBy === 'bestMatch' && !canAccess('personalized_scores')) {
      setSortBy('name');
    }
  }, [hasCustomPreferences, canAccess, sortBy]);

  // Handle comparison toggle with limit feedback
  const handleToggleComparison = useCallback((id: string) => {
    const result = toggleComparison(id);
    if (result.action === 'limit_reached') {
      Alert.alert(
        'Comparison Limit Reached',
        `You can compare up to ${comparisonLimit} neighborhoods. Upgrade to Premium to compare more!`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Paywall', { source: 'comparison_limit' }) },
        ]
      );
    }
  }, [toggleComparison, comparisonLimit, navigation]);

  // Filter, sort, and calculate match percentages via reusable hook
  const { filteredNeighborhoods, matchPercentages, hasActiveFilters } = useFilteredNeighborhoods(
    cityNeighborhoods,
    { searchQuery, minAffordability, minSafety, minTransit, sortBy, preferences, hasCustomPreferences },
  );

  // Memoized render function for FlatList
  const renderNeighborhoodCard = useCallback(({ item: neighborhood }: { item: Neighborhood | ScoredNeighborhood }) => {
    const neighborhoodPhotos = photos[neighborhood.id] || [];
    // Show match score whenever user has custom preferences (not just when sorting by bestMatch)
    const matchScore = hasCustomPreferences ? matchPercentages[neighborhood.id] : null;
    return (
      <NeighborhoodCard
        neighborhood={neighborhood}
        onPress={() => navigation.navigate('Detail', { neighborhood })}
        currentStatus={status[neighborhood.id] || null}
        isInComparison={comparison.includes(neighborhood.id)}
        onAddToPlaces={handleAddToPlaces}
        onToggleComparison={() => handleToggleComparison(neighborhood.id)}
        viewMode={viewMode}
        photoCount={neighborhoodPhotos.length}
        firstPhotoUri={neighborhoodPhotos[0] || null}
        matchScore={matchScore}
        currencySymbol={selectedCity.currencySymbol}
      />
    );
  }, [navigation, status, comparison, handleAddToPlaces, handleToggleComparison, viewMode, photos, hasCustomPreferences, matchPercentages, selectedCity.currencySymbol]);

  const keyExtractor = useCallback((item: Neighborhood) => item.id, []);

  const ListHeader = useMemo(() => (
    <View>
      {/* Prominent card for first-time users - opens match modal */}
      {!hasCustomPreferences && (
        <TouchableOpacity
          style={styles.personalizeCard}
          onPress={() => setShowMatchModal(true)}
        >
          <View style={styles.personalizeIcon}>
            <Ionicons name="sparkles" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.personalizeContent}>
            <Text style={styles.personalizeTitle}>Find Your Perfect Match</Text>
            <Text style={styles.personalizeSubtitle}>
              Take a quiz, describe what you want, or set your preferences
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
        </TouchableOpacity>
      )}

      <Text style={styles.resultCount}>
        {filteredNeighborhoods.length} neighborhood{filteredNeighborhoods.length !== 1 ? 's' : ''} found
      </Text>
    </View>
  ), [filteredNeighborhoods.length, hasCustomPreferences]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xl }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>MyCorner</Text>
          <CityHeaderSelector onPress={() => setShowCitySelectorModal(true)} />
        </View>
        <Text style={styles.subtitle}>Discover your perfect area</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search neighborhoods..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray400}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlPill, hasActiveFilters && styles.controlPillActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={16} color={hasActiveFilters ? COLORS.primary : COLORS.white} />
            <Text style={[styles.controlPillText, hasActiveFilters && styles.controlPillTextActive]}>
              Filter{hasActiveFilters ? ' •' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlPill, sortBy !== 'name' && styles.controlPillActive]}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={sortBy !== 'name' ? COLORS.primary : COLORS.white} />
            <Text style={[styles.controlPillText, sortBy !== 'name' && styles.controlPillTextActive]}>
              {sortBy === 'name' ? 'Sort' : sortBy === 'bestMatch' ? 'Best Match' : sortBy === 'affordability' ? 'Affordable' : sortBy === 'safety' ? 'Safest' : 'Transit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.matchPill, hasCustomPreferences && styles.matchPillActive]}
            onPress={() => setShowMatchModal(true)}
          >
            <Ionicons name="sparkles" size={16} color={hasCustomPreferences ? COLORS.primary : COLORS.white} />
            <Text style={[styles.controlPillText, hasCustomPreferences && styles.controlPillTextActive]}>
              Match{hasCustomPreferences ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
          >
            <Ionicons
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
              size={20}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredNeighborhoods}
        renderItem={renderNeighborhoodCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        minAffordability={minAffordability}
        minSafety={minSafety}
        minTransit={minTransit}
        setMinAffordability={setMinAffordability}
        setMinSafety={setMinSafety}
        setMinTransit={setMinTransit}
        currencySymbol={selectedCity.currencySymbol}
      />

      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        requiresUpgrade={requiresUpgrade}
        onNavigatePaywall={() => navigation.navigate('Paywall', { source: 'best_match_sort' })}
      />

      {/* City selector modal - handles both first-launch and regular switching */}
      <CitySelectorModal
        visible={showCitySelectorModal || (showCityPicker && !hasSelectedCity)}
        onClose={() => setShowCitySelectorModal(false)}
        isFirstLaunch={!hasSelectedCity}
      />

      {/* Lifted modals - single instance for all cards */}
      <SignInPromptModal
        visible={showSignInModal}
        onClose={() => {
          dismissSignInModal();
          setSelectedNeighborhoodId(null);
        }}
        featureName="saving places"
      />

      <StatusPickerModal
        visible={showStatusPicker}
        onClose={() => {
          setShowStatusPicker(false);
          setSelectedNeighborhoodId(null);
        }}
        currentStatus={selectedNeighborhoodId ? status[selectedNeighborhoodId] || null : null}
        onSelectStatus={handleSetStatus}
        neighborhoodName={selectedNeighborhood?.name || ''}
      />

      <MatchModal
        visible={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        hasCustomPreferences={hasCustomPreferences}
        requiresUpgrade={requiresUpgrade}
        onNavigatePaywall={(source) => navigation.navigate('Paywall', { source })}
        onNavigateMatcher={() => navigation.navigate('Matcher')}
        onNavigatePreferences={() => navigation.navigate('Preferences')}
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
    padding: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray900,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlPillActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  controlPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  controlPillTextActive: {
    color: COLORS.primary,
  },
  viewToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  matchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  matchPillActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  content: {
    padding: SPACING.lg,
  },
  personalizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.small,
  },
  personalizeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  personalizeContent: {
    flex: 1,
  },
  personalizeTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  personalizeSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  resultCount: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
});
