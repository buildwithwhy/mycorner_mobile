import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS, STATUS_CONFIG } from '../../constants/theme';
import type { NeighborhoodStatus } from '../../contexts/AppContext';

interface DetailFooterActionsProps {
  currentStatus: NeighborhoodStatus;
  isInComparison: boolean;
  onSavePress: () => void;
  onComparePress: () => void;
  onSharePress: () => void;
  onStatusPress: () => void;
}

function DetailFooterActionsInner({
  currentStatus,
  isInComparison,
  onSavePress,
  onComparePress,
  onSharePress,
  onStatusPress,
}: DetailFooterActionsProps) {
  return (
    <View style={styles.footer}>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, currentStatus && styles.actionButtonActive]}
          onPress={onSavePress}
          accessibilityLabel={currentStatus ? 'Saved' : 'Save'}
          accessibilityRole="button"
        >
          <Ionicons
            name={currentStatus ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={currentStatus ? COLORS.primary : COLORS.gray500}
          />
          <Text style={[styles.actionButtonText, currentStatus && styles.actionButtonTextActive]}>
            {currentStatus ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isInComparison && styles.actionButtonActive]}
          onPress={onComparePress}
          accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isInComparison ? 'git-compare' : 'git-compare-outline'}
            size={20}
            color={isInComparison ? COLORS.primary : COLORS.gray500}
          />
          <Text style={[styles.actionButtonText, isInComparison && styles.actionButtonTextActive]}>
            {isInComparison ? 'Comparing' : 'Compare'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onSharePress} accessibilityLabel="Share" accessibilityRole="button">
          <Ionicons name="share-outline" size={20} color={COLORS.gray500} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.statusButton}
        onPress={onStatusPress}
        accessibilityLabel={currentStatus ? STATUS_CONFIG[currentStatus].label : 'Add to My Places'}
        accessibilityRole="button"
      >
        <Ionicons name={currentStatus ? 'bookmark' : 'bookmark-outline'} size={20} color="white" />
        <Text style={styles.statusButtonText}>
          {currentStatus ? STATUS_CONFIG[currentStatus].label : 'Add to My Places'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
}

export const DetailFooterActions = React.memo(DetailFooterActionsInner);

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    ...SHADOWS.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  actionButtonTextActive: {
    color: COLORS.primary,
  },
  statusButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.sm,
  },
  statusButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
