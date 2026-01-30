import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Neighborhood } from '../data/neighborhoods';
import { useApp, useCity, useNotesRatings, NeighborhoodStatus } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import NeighborhoodCard, { ViewMode } from '../components/NeighborhoodCard';
import SignInPromptModal from '../components/SignInPromptModal';
import StatusPickerModal from '../components/StatusPickerModal';
import { CityHeaderSelector, CitySelectorModal } from '../components/CitySelector';
import { scoreAndSortNeighborhoods, calculateMatchPercentage, ScoredNeighborhood } from '../utils/personalizedScoring';

type SortOption = 'name' | 'affordability' | 'safety' | 'transit' | 'bestMatch';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const { status, setNeighborhoodStatus, comparison, toggleComparison, comparisonLimit } = useApp();
  const { cityNeighborhoods, showCityPicker, hasSelectedCity } = useCity();
  const { photos } = useNotesRatings();
  const { preferences, hasCustomPreferences } = usePreferences();
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
  const [showSignInModal, setShowSignInModal] = useState(false);
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
    if (!session) {
      setShowSignInModal(true);
    } else {
      setShowStatusPicker(true);
    }
  }, [session]);

  // Handler for status selection
  const handleSetStatus = useCallback((newStatus: NeighborhoodStatus) => {
    if (selectedNeighborhoodId) {
      setNeighborhoodStatus(selectedNeighborhoodId, newStatus);
    }
    setShowStatusPicker(false);
    setSelectedNeighborhoodId(null);
  }, [selectedNeighborhoodId, setNeighborhoodStatus]);

  // Auto-switch to "Best Match" sort when user has custom preferences
  useEffect(() => {
    if (hasCustomPreferences && sortBy === 'name') {
      setSortBy('bestMatch');
    }
  }, [hasCustomPreferences]);

  // Handle comparison toggle with limit feedback
  const handleToggleComparison = useCallback((id: string) => {
    const result = toggleComparison(id);
    if (result.action === 'limit_reached') {
      Alert.alert(
        'Comparison Limit Reached',
        `You can compare up to ${comparisonLimit} neighborhoods. Upgrade to Premium to compare more!`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Paywall' as never) },
        ]
      );
    }
  }, [toggleComparison, comparisonLimit, navigation]);

  // Memoized filter and sort for better performance
  const filteredNeighborhoods = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    const filtered = cityNeighborhoods.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.name.toLowerCase().includes(searchLower) ||
        n.borough.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower);

      const matchesAffordability = n.affordability >= minAffordability;
      const matchesSafety = n.safety >= minSafety;
      const matchesTransit = n.transit >= minTransit;

      return matchesSearch && matchesAffordability && matchesSafety && matchesTransit;
    });

    // Sort filtered results
    if (sortBy === 'bestMatch') {
      // Use personalized scoring for "Best Match" sort
      return scoreAndSortNeighborhoods(filtered, preferences);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'affordability') return b.affordability - a.affordability;
      if (sortBy === 'safety') return b.safety - a.safety;
      if (sortBy === 'transit') return b.transit - a.transit;
      return 0;
    });
  }, [cityNeighborhoods, searchQuery, sortBy, minAffordability, minSafety, minTransit, preferences]);

  // Calculate match percentages as ranking percentiles for display
  // Shows "Top X%" - how this neighborhood ranks among all neighborhoods based on preferences
  // Always calculate when user has custom preferences, regardless of current sort
  const matchPercentages = useMemo(() => {
    if (!hasCustomPreferences) return {};

    // Score and sort by preferences to get rankings
    const scoredAndSorted = scoreAndSortNeighborhoods(filteredNeighborhoods, preferences);
    const total = scoredAndSorted.length;

    const percentages: Record<string, number> = {};
    scoredAndSorted.forEach((n, index) => {
      // Calculate percentile rank (top 1 = 99%, middle = 50%, last = 1%)
      const percentileRank = Math.round(((total - index) / total) * 100);
      percentages[n.id] = Math.max(1, percentileRank);
    });

    return percentages;
  }, [filteredNeighborhoods, preferences, hasCustomPreferences]);

  const hasActiveFilters = minAffordability > 1 || minSafety > 1 || minTransit > 1;

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
      />
    );
  }, [navigation, status, comparison, handleAddToPlaces, handleToggleComparison, viewMode, photos, hasCustomPreferences, matchPercentages]);

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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>MyCorner</Text>
          <CityHeaderSelector onPress={() => setShowCitySelectorModal(true)} />
        </View>
        <Text style={styles.subtitle}>Discover your perfect area</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search neighborhoods..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controls}>
          <View style={styles.controlsLeft}>
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
          </View>

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

      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Affordability: {minAffordability}/5</Text>
                <View style={styles.filterOptions}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterChip, minAffordability === value && styles.filterChipActive]}
                      onPress={() => setMinAffordability(value)}
                    >
                      <Text style={[styles.filterChipText, minAffordability === value && styles.filterChipTextActive]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Safety: {minSafety}/5</Text>
                <View style={styles.filterOptions}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterChip, minSafety === value && styles.filterChipActive]}
                      onPress={() => setMinSafety(value)}
                    >
                      <Text style={[styles.filterChipText, minSafety === value && styles.filterChipTextActive]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Transit: {minTransit}/5</Text>
                <View style={styles.filterOptions}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterChip, minTransit === value && styles.filterChipActive]}
                      onPress={() => setMinTransit(value)}
                    >
                      <Text style={[styles.filterChipText, minTransit === value && styles.filterChipTextActive]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setMinAffordability(1);
                  setMinSafety(1);
                  setMinTransit(1);
                }}
              >
                <Text style={styles.modalClearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSortModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.sortModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'bestMatch' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('bestMatch');
                  setShowSortModal(false);
                }}
              >
                <Ionicons name="heart" size={24} color={sortBy === 'bestMatch' ? COLORS.primary : COLORS.gray500} />
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionTitle, sortBy === 'bestMatch' && styles.sortOptionTitleActive]}>
                    Best Match
                  </Text>
                  <Text style={styles.sortOptionDescription}>Based on your preferences</Text>
                </View>
                {sortBy === 'bestMatch' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('name');
                  setShowSortModal(false);
                }}
              >
                <Ionicons name="text" size={24} color={sortBy === 'name' ? COLORS.primary : COLORS.gray500} />
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionTitle, sortBy === 'name' && styles.sortOptionTitleActive]}>
                    Name
                  </Text>
                  <Text style={styles.sortOptionDescription}>Alphabetical order</Text>
                </View>
                {sortBy === 'name' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'affordability' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('affordability');
                  setShowSortModal(false);
                }}
              >
                <Ionicons name="cash-outline" size={24} color={sortBy === 'affordability' ? COLORS.primary : COLORS.gray500} />
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionTitle, sortBy === 'affordability' && styles.sortOptionTitleActive]}>
                    Affordability
                  </Text>
                  <Text style={styles.sortOptionDescription}>Most affordable first</Text>
                </View>
                {sortBy === 'affordability' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'safety' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('safety');
                  setShowSortModal(false);
                }}
              >
                <Ionicons name="shield-checkmark" size={24} color={sortBy === 'safety' ? COLORS.primary : COLORS.gray500} />
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionTitle, sortBy === 'safety' && styles.sortOptionTitleActive]}>
                    Safety
                  </Text>
                  <Text style={styles.sortOptionDescription}>Safest areas first</Text>
                </View>
                {sortBy === 'safety' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'transit' && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy('transit');
                  setShowSortModal(false);
                }}
              >
                <Ionicons name="bus" size={24} color={sortBy === 'transit' ? COLORS.primary : COLORS.gray500} />
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionTitle, sortBy === 'transit' && styles.sortOptionTitleActive]}>
                    Transit
                  </Text>
                  <Text style={styles.sortOptionDescription}>Best transit first</Text>
                </View>
                {sortBy === 'transit' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
          setShowSignInModal(false);
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

      {/* Match Modal - personalization options */}
      <Modal visible={showMatchModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.matchModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Your Match</Text>
              <TouchableOpacity onPress={() => setShowMatchModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>

            <View style={styles.matchOptions}>
              <TouchableOpacity
                style={styles.matchOption}
                onPress={() => {
                  setShowMatchModal(false);
                  navigation.navigate('Matcher' as never);
                }}
              >
                <View style={[styles.matchOptionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="clipboard-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.matchOptionContent}>
                  <Text style={styles.matchOptionTitle}>Take the Quiz</Text>
                  <Text style={styles.matchOptionDescription}>
                    Answer a few quick questions about your lifestyle
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matchOption}
                onPress={() => {
                  setShowMatchModal(false);
                  navigation.navigate('Matcher' as never);
                }}
              >
                <View style={[styles.matchOptionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="chatbubble-outline" size={24} color="#6366F1" />
                </View>
                <View style={styles.matchOptionContent}>
                  <Text style={styles.matchOptionTitle}>Describe What You Want</Text>
                  <Text style={styles.matchOptionDescription}>
                    Tell us in your own words what matters to you
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matchOption}
                onPress={() => {
                  setShowMatchModal(false);
                  navigation.navigate('Preferences' as never);
                }}
              >
                <View style={[styles.matchOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="options-outline" size={24} color="#D97706" />
                </View>
                <View style={styles.matchOptionContent}>
                  <Text style={styles.matchOptionTitle}>Adjust Weights</Text>
                  <Text style={styles.matchOptionDescription}>
                    Fine-tune how important each factor is to you
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            </View>

            {hasCustomPreferences && (
              <View style={styles.matchStatus}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.matchStatusText}>Your preferences are active</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
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
    justifyContent: 'space-between',
  },
  controlsLeft: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  modalScroll: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  modalClearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalClearButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  modalApplyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  sortModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  sortOptions: {
    padding: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sortOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sortOptionText: {
    flex: 1,
  },
  sortOptionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  sortOptionTitleActive: {
    color: COLORS.primary,
  },
  sortOptionDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },

  // Match Modal Styles
  matchModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area
  },
  matchOptions: {
    padding: 16,
  },
  matchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    marginBottom: 12,
  },
  matchOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  matchOptionContent: {
    flex: 1,
  },
  matchOptionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  matchOptionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  matchStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.success,
  },
});
