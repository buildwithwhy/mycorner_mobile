import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { neighborhoods, Neighborhood } from '../data/neighborhoods';
import { useApp } from '../contexts/AppContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import NeighborhoodCard from '../components/NeighborhoodCard';

type SortOption = 'name' | 'affordability' | 'safety' | 'transit';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { status, setNeighborhoodStatus, comparison, toggleComparison } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [minAffordability, setMinAffordability] = useState(1);
  const [minSafety, setMinSafety] = useState(1);
  const [minTransit, setMinTransit] = useState(1);

  // Memoized filter and sort for better performance
  const filteredNeighborhoods = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    const filtered = neighborhoods.filter((n) => {
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
    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'affordability') return b.affordability - a.affordability;
      if (sortBy === 'safety') return b.safety - a.safety;
      if (sortBy === 'transit') return b.transit - a.transit;
      return 0;
    });
  }, [searchQuery, sortBy, minAffordability, minSafety, minTransit]);

  const hasActiveFilters = minAffordability > 1 || minSafety > 1 || minTransit > 1;

  // Memoized render function for FlatList
  const renderNeighborhoodCard = useCallback(({ item: neighborhood }: { item: Neighborhood }) => (
    <NeighborhoodCard
      neighborhood={neighborhood}
      onPress={() => navigation.navigate('Detail', { neighborhood })}
      currentStatus={status[neighborhood.id] || null}
      isInComparison={comparison.includes(neighborhood.id)}
      onSetStatus={(newStatus) => setNeighborhoodStatus(neighborhood.id, newStatus)}
      onToggleComparison={() => toggleComparison(neighborhood.id)}
    />
  ), [navigation, status, comparison, setNeighborhoodStatus, toggleComparison]);

  const keyExtractor = useCallback((item: Neighborhood) => item.id, []);

  const ListHeader = useMemo(() => (
    <Text style={styles.resultCount}>
      {filteredNeighborhoods.length} neighborhood{filteredNeighborhoods.length !== 1 ? 's' : ''} found
    </Text>
  ), [filteredNeighborhoods.length]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MyCorner</Text>
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
          <TouchableOpacity
            style={[styles.controlButton, hasActiveFilters && styles.controlButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={18} color={hasActiveFilters ? COLORS.primary : COLORS.gray500} />
            <Text style={[styles.controlButtonText, hasActiveFilters && styles.controlButtonTextActive]}>
              Filters {hasActiveFilters && '•'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={() => setShowSortModal(true)}>
            <Ionicons name="swap-vertical" size={18} color="#6b7280" />
            <Text style={styles.controlButtonText}>
              Sort: {sortBy === 'name' ? 'Name' : sortBy === 'affordability' ? 'Affordable' : sortBy === 'safety' ? 'Safety' : 'Transit'}
            </Text>
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
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
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
    gap: 8,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  controlButtonActive: {
    backgroundColor: COLORS.white,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  controlButtonTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
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
});
