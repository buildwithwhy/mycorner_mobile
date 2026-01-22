import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { neighborhoods } from '../data/neighborhoods';
import { calculateDistance, estimateCommuteTime } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { COLORS, DESTINATION_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import AffordabilityBadge from '../components/AffordabilityBadge';

export default function CompareScreen() {
  const { comparison, toggleComparison, clearComparison, notes, destinations } = useApp();

  const compareNeighborhoods = neighborhoods.filter((n) => comparison.includes(n.id));

  if (compareNeighborhoods.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Compare</Text>
        </View>
        <EmptyState
          icon="git-compare-outline"
          title="No neighborhoods to compare"
          message="Tap the compare button on neighborhood details to add them here (max 3)"
        />
      </View>
    );
  }

  const metrics = [
    { label: 'Affordability', icon: 'cash-outline' as keyof typeof Ionicons.glyphMap, key: 'affordability' },
    { label: 'Safety', icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap, key: 'safety' },
    { label: 'Transit', icon: 'bus' as keyof typeof Ionicons.glyphMap, key: 'transit' },
    { label: 'Green Space', icon: 'leaf' as keyof typeof Ionicons.glyphMap, key: 'greenSpace' },
    { label: 'Nightlife', icon: 'moon' as keyof typeof Ionicons.glyphMap, key: 'nightlife' },
    { label: 'Family Friendly', icon: 'people' as keyof typeof Ionicons.glyphMap, key: 'familyFriendly' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Compare</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearComparison}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.tableWrapper}>
          {/* Fixed Label Column */}
          <View style={styles.labelColumn}>
            <View style={styles.headerLabelCell}>
              <Text style={styles.headerLabelText}>Neighborhood</Text>
            </View>
            {metrics.map((metric) => (
              <View key={metric.key} style={styles.metricLabelCell}>
                <Ionicons name={metric.icon} size={18} color="#6b7280" />
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
            <View style={styles.metricLabelCell}>
              <Ionicons name="document-text" size={18} color="#6b7280" />
              <Text style={styles.metricLabel}>My Notes</Text>
            </View>
            {destinations.length > 0 && (
              <>
                <View style={styles.commuteSectionHeader}>
                  <Text style={styles.commuteSectionTitle}>COMMUTE TIMES</Text>
                </View>
                {destinations.map((destination, index) => (
                  <View key={destination.id} style={styles.metricLabelCell}>
                    <View style={[styles.destinationDot, { backgroundColor: DESTINATION_COLORS[index % DESTINATION_COLORS.length] }]} />
                    <Text style={styles.metricLabel}>{destination.label}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Scrollable Neighborhood Columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollableColumns}>
            {compareNeighborhoods.map((n) => (
              <View key={n.id} style={styles.neighborhoodColumn}>
                {/* Header */}
                <View style={styles.headerCell}>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => toggleComparison(n.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                  <Text style={styles.headerCellTitle}>{n.name}</Text>
                  <Text style={styles.headerCellSubtitle}>{n.borough}</Text>
                </View>

                {/* Metrics */}
                {metrics.map((metric) => {
                  const value = n[metric.key as keyof typeof n] as number;
                  return (
                    <View key={metric.key} style={styles.metricValueCell}>
                      <View style={styles.valueContainer}>
                        {metric.key === 'affordability' ? (
                          <View style={styles.affordabilityBadge}>
                            <AffordabilityBadge value={value} />
                          </View>
                        ) : (
                          <View style={styles.rating}>
                            {[...Array(5)].map((_, i) => (
                              <Ionicons
                                key={i}
                                name={i < value ? 'star' : 'star-outline'}
                                size={14}
                                color="#6366f1"
                              />
                            ))}
                          </View>
                        )}
                        <Text style={styles.valueText}>{value}/5</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Notes */}
                <View style={styles.metricValueCell}>
                  <Text style={styles.noteText} numberOfLines={3}>
                    {notes[n.id] || 'No notes yet'}
                  </Text>
                </View>

                {/* Commute Times */}
                {destinations.length > 0 && (
                  <>
                    <View style={styles.commuteSectionHeaderPlaceholder} />
                    {destinations.map((destination) => {
                      const neighborhoodCoords = getNeighborhoodCoordinates(n.id);
                      const distance = calculateDistance(
                        neighborhoodCoords.latitude,
                        neighborhoodCoords.longitude,
                        destination.latitude,
                        destination.longitude
                      );
                      const time = estimateCommuteTime(distance);
                      return (
                        <View key={destination.id} style={styles.metricValueCell}>
                          <Text style={styles.valueText}>{time}</Text>
                          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  clearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  tableWrapper: {
    flexDirection: 'row',
    padding: SPACING.lg,
  },
  labelColumn: {
    width: 130,
  },
  scrollableColumns: {
    flex: 1,
  },
  neighborhoodColumn: {
    width: 160,
  },
  headerLabelCell: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    marginBottom: 2,
    height: 70,
  },
  headerLabelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerCell: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    marginBottom: 2,
    height: 70,
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 1,
  },
  headerCellTitle: {
    fontSize: FONT_SIZES.lg - 1,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
    marginRight: SPACING.xxl,
  },
  headerCellSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  metricLabelCell: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    marginBottom: 2,
    height: 60,
  },
  metricLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray500,
    flex: 1,
  },
  metricValueCell: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gray200,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    height: 60,
  },
  valueContainer: {
    alignItems: 'center',
  },
  affordabilityBadge: {
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  valueText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    lineHeight: 16,
    textAlign: 'center',
  },
  commuteSectionHeader: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: 2,
    height: 48,
  },
  commuteSectionHeaderPlaceholder: {
    height: 48,
    marginTop: SPACING.sm,
    marginBottom: 2,
  },
  commuteSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  distanceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    marginTop: 2,
  },
});
