import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';
import type { CommuteItem } from '../../hooks/useCommuteData';

interface DetailCommuteSectionProps {
  commuteItems: CommuteItem[];
  onManageDestinations: () => void;
}

function DetailCommuteSectionInner({
  commuteItems,
  onManageDestinations,
}: DetailCommuteSectionProps) {
  if (commuteItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Commute Times</Text>
        <TouchableOpacity onPress={onManageDestinations}>
          <Text style={styles.manageLink}>Manage</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.commuteList}>
        {commuteItems.map((item) => (
          <View key={item.destinationId} style={styles.commuteItem}>
            <View
              style={[
                styles.commuteIconCircle,
                { backgroundColor: item.color },
              ]}
            >
              <Ionicons name={item.modeIcon as keyof typeof Ionicons.glyphMap} size={16} color="white" />
            </View>
            <View style={styles.commuteTextContainer}>
              <Text style={styles.commuteLabel}>{item.label}</Text>
              <Text style={styles.commuteAddress} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
            <View style={styles.commuteTimeContainer}>
              <Text style={styles.commuteTime}>{item.time}</Text>
              <Text style={styles.commuteDistance}>{item.distance.toFixed(1)} km</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const DetailCommuteSection = React.memo(DetailCommuteSectionInner);

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  manageLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  commuteList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  commuteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  commuteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  commuteTextContainer: {
    flex: 1,
  },
  commuteLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  commuteAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  commuteTimeContainer: {
    alignItems: 'flex-end',
  },
  commuteTime: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  commuteDistance: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
});
