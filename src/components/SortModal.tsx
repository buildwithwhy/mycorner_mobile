import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, MODAL_STYLES } from '../constants/theme';
import { PremiumBadge } from './FeatureGate';
import { SORTABLE_METRICS } from '../config/metrics';
import type { MetricKey } from '../config/metrics';
import type { FeatureKey } from '../config/subscriptions';

export type SortOption = 'name' | 'bestMatch' | MetricKey;

interface SortOptionItem {
  key: SortOption;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  feature?: FeatureKey;
}

// Non-metric sort options + metric-derived sort options
const SORT_OPTIONS: SortOptionItem[] = [
  { key: 'bestMatch', icon: 'heart', label: 'Best Match', description: 'Based on your preferences', feature: 'personalized_scores' },
  { key: 'name', icon: 'text', label: 'Name', description: 'Alphabetical order' },
  ...SORTABLE_METRICS.map((m): SortOptionItem => ({
    key: m.key,
    icon: m.icon,
    label: m.label,
    description: m.sortDescription ?? `Best ${m.label.toLowerCase()} first`,
  })),
];

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  requiresUpgrade: (feature: FeatureKey) => boolean;
  onNavigatePaywall: () => void;
}

export default function SortModal({
  visible,
  onClose,
  sortBy,
  setSortBy,
  requiresUpgrade,
  onNavigatePaywall,
}: SortModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={MODAL_STYLES.overlay}>
        <View style={[MODAL_STYLES.content, { maxHeight: '60%' }]}>
          <View style={MODAL_STYLES.header}>
            <Text style={MODAL_STYLES.title}>Sort By</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.option, sortBy === option.key && styles.optionActive]}
                onPress={() => {
                  if (option.feature && requiresUpgrade(option.feature)) {
                    onClose();
                    onNavigatePaywall();
                  } else {
                    setSortBy(option.key);
                    onClose();
                  }
                }}
              >
                <Ionicons name={option.icon} size={24} color={sortBy === option.key ? COLORS.primary : COLORS.gray500} />
                <View style={styles.optionText}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, sortBy === option.key && styles.optionTitleActive]}>
                      {option.label}
                    </Text>
                    {option.feature && requiresUpgrade(option.feature) && <PremiumBadge />}
                  </View>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {sortBy === option.key && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  options: {
    padding: 20,
  },
  option: {
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
  optionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  optionText: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  optionTitleActive: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
});
