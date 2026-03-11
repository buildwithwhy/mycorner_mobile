import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';

interface ItineraryBarProps {
  stopCount: number;
  totalWalkTime: string;
  onPress: () => void;
}

function ItineraryBarInner({ stopCount, totalWalkTime, onPress }: ItineraryBarProps) {
  if (stopCount === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.bar} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.info}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stopCount}</Text>
          </View>
          <View>
            <Text style={styles.title}>
              {stopCount === 1 ? '1 stop planned' : `${stopCount} stops planned`}
            </Text>
            <Text style={styles.subtitle}>{totalWalkTime} total walk</Text>
          </View>
        </View>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
          <Ionicons name="chevron-up" size={16} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export const ItineraryBar = React.memo(ItineraryBarInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.medium,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  viewButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
});
