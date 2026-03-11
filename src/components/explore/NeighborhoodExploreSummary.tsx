import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import type { ExploreSummary } from '../../data/exploreSummaries';

interface Props {
  summary: ExploreSummary;
}

function NeighborhoodExploreSummaryComponent({ summary }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="compass-outline" size={18} color={COLORS.primary} />
        <Text style={styles.headerText}>About this area</Text>
      </View>
      <Text style={styles.blurb}>{summary.blurb}</Text>
      <View style={styles.chipsRow}>
        {summary.highlightChips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const NeighborhoodExploreSummary = React.memo(
  NeighborhoodExploreSummaryComponent,
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  blurb: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray700,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
