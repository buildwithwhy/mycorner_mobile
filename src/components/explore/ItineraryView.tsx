import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';
import type { ItineraryStop } from '../../types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cafe: 'cafe-outline',
  restaurant: 'restaurant-outline',
  bar: 'beer-outline',
  park: 'leaf-outline',
  market: 'cart-outline',
  museum: 'business-outline',
  shop: 'bag-outline',
  landmark: 'flag-outline',
  other: 'pin-outline',
};

interface ItineraryViewProps {
  visible: boolean;
  onClose: () => void;
  stops: ItineraryStop[];
  totalWalkTime: string;
  totalDistance: number;
  neighborhoodName: string;
  onRemoveStop: (spotId: string) => void;
  onOptimize: () => void;
  onShare: () => void;
  onSave: () => void;
  onClear: () => void;
}

function ItineraryViewInner({
  visible,
  onClose,
  stops,
  totalWalkTime,
  totalDistance,
  neighborhoodName,
  onRemoveStop,
  onOptimize,
  onShare,
  onSave,
  onClear,
}: ItineraryViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top + SPACING.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={28} color={COLORS.gray700} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Itinerary</Text>
            <Text style={styles.headerSubtitle}>{neighborhoodName}</Text>
          </View>
          <TouchableOpacity onPress={onShare} accessibilityLabel="Share itinerary" accessibilityRole="button">
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Ionicons name="walk" size={20} color={COLORS.primary} />
            <Text style={styles.summaryText}>{totalWalkTime}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryText}>{totalDistance.toFixed(1)} km</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryText}>{stops.length} stops</Text>
          </View>
        </View>

        {/* Stops List */}
        <ScrollView style={styles.stopsList} showsVerticalScrollIndicator={false}>
          {stops.map((stop, index) => (
            <View key={stop.spot.id}>
              {/* Walk time indicator between stops */}
              {stop.walkTimeFromPrevious && (
                <View style={styles.walkIndicator}>
                  <View style={styles.walkLine} />
                  <View style={styles.walkBadge}>
                    <Ionicons name="walk" size={14} color={COLORS.gray500} />
                    <Text style={styles.walkTime}>{stop.walkTimeFromPrevious}</Text>
                  </View>
                  <View style={styles.walkLine} />
                </View>
              )}

              {/* Stop card */}
              <View style={styles.stopCard}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopIcon}>
                  <Ionicons
                    name={CATEGORY_ICONS[stop.spot.category] || 'pin-outline'}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.spot.name}</Text>
                  {stop.spot.address && (
                    <Text style={styles.stopAddress} numberOfLines={1}>{stop.spot.address}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveStop(stop.spot.id)}
                  accessibilityLabel="Remove stop"
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={{ height: SPACING.xxxl }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
          <TouchableOpacity style={styles.optimizeButton} onPress={onOptimize}>
            <Ionicons name="shuffle" size={18} color={COLORS.primary} />
            <Text style={styles.optimizeText}>Optimize</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Ionicons name="bookmark-outline" size={18} color={COLORS.white} />
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export const ItineraryView = React.memo(ItineraryViewInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray200,
  },
  stopsList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  walkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  walkLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  walkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
  },
  walkTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stopNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  stopIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  stopAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  optimizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  optimizeText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  saveText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.errorLight,
  },
});
