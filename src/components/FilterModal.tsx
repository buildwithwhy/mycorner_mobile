import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, MODAL_STYLES } from '../constants/theme';
import { FILTERABLE_METRICS } from '../config/metrics';
import type { MetricKey } from '../config/metrics';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: Record<string, number>;
  setFilter: (key: MetricKey, value: number) => void;
  currencySymbol: string;
}

export default function FilterModal({
  visible,
  onClose,
  filters,
  setFilter,
  currencySymbol,
}: FilterModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={MODAL_STYLES.overlay}>
        <View style={MODAL_STYLES.content}>
          <View style={MODAL_STYLES.header}>
            <Text style={MODAL_STYLES.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            {FILTERABLE_METRICS.map((metric) => {
              const value = filters[metric.key] ?? 1;
              const isAffordability = metric.key === 'affordability';

              return (
                <View key={metric.key} style={styles.section}>
                  <Text style={styles.label}>
                    {isAffordability
                      ? metric.filterLabel ?? metric.label
                      : `${metric.filterLabel ?? `Minimum ${metric.label}`}: ${value}/5`}
                  </Text>
                  <View style={styles.options}>
                    {[1, 2, 3, 4, 5].map((chipValue) => (
                      <TouchableOpacity
                        key={chipValue}
                        style={[styles.chip, value === chipValue && styles.chipActive]}
                        onPress={() => setFilter(metric.key, chipValue)}
                      >
                        <Text style={[styles.chipText, value === chipValue && styles.chipTextActive]}>
                          {isAffordability ? currencySymbol.repeat(6 - chipValue) : chipValue}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                FILTERABLE_METRICS.forEach((m) => setFilter(m.key, 1));
              }}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 12,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});
