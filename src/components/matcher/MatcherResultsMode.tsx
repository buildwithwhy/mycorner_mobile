import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { CRITERIA_INFO, ScoringCriterion } from '../../contexts/PreferencesContext';
import type { ScoredNeighborhood } from '../../utils/personalizedScoring';
import type { ScoringPreferences } from '../../contexts/PreferencesContext';

interface DetectedCriterionInfo {
  criterion: keyof ScoringPreferences;
  importance: 'high' | 'low' | 'neutral';
  matchedKeywords: string[];
}

interface MatcherResultsModeProps {
  detectedCriteria: DetectedCriterionInfo[];
  topMatches: ScoredNeighborhood[];
  onApply: () => void;
  onRestart: () => void;
  onViewDetail: (neighborhood: ScoredNeighborhood) => void;
}

export default function MatcherResultsMode({
  detectedCriteria,
  topMatches,
  onApply,
  onRestart,
  onViewDetail,
}: MatcherResultsModeProps) {
  return (
    <ScrollView style={styles.content}>
      {/* Success header */}
      <View style={styles.resultsHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
        </View>
        <Text style={styles.resultsTitle}>We Found Your Matches!</Text>
        {detectedCriteria.length > 0 && (
          <View style={styles.detectedCriteria}>
            <Text style={styles.detectedLabel}>Based on your priorities:</Text>
            <View style={styles.criteriaChips}>
              {detectedCriteria
                .filter((c) => c.importance === 'high')
                .map((c) => (
                  <View key={c.criterion} style={styles.criteriaChip}>
                    <Ionicons
                      name={CRITERIA_INFO[c.criterion as ScoringCriterion].icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.criteriaChipText}>{CRITERIA_INFO[c.criterion as ScoringCriterion].label}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>

      {/* Top matches */}
      <View style={styles.matchesSection}>
        <Text style={styles.matchesSectionTitle}>Top Neighborhoods for You</Text>
        {topMatches.map((neighborhood, index) => (
          <TouchableOpacity
            key={neighborhood.id}
            style={styles.matchCard}
            onPress={() => onViewDetail(neighborhood)}
          >
            <View style={styles.matchRank}>
              <Text style={styles.matchRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{neighborhood.name}</Text>
              <Text style={styles.matchBorough}>{neighborhood.borough}</Text>
            </View>
            <View style={styles.matchScore}>
              <Text style={styles.matchScoreValue}>{neighborhood.personalizedScore.toFixed(1)}</Text>
              <Text style={styles.matchScoreLabel}>score</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.resultsActions}>
        <TouchableOpacity style={styles.applyButton} onPress={onApply}>
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
          <Text style={styles.applyButtonText}>Apply These Preferences</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.startOverButton} onPress={onRestart}>
          <Ionicons name="refresh" size={20} color={COLORS.gray500} />
          <Text style={styles.startOverButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },

  // Results mode
  resultsHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  detectedCriteria: {
    alignItems: 'center',
  },
  detectedLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  criteriaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  criteriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  criteriaChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  matchesSection: {
    padding: SPACING.lg,
  },
  matchesSectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.small,
  },
  matchRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  matchRankText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  matchBorough: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  matchScore: {
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  matchScoreValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  matchScoreLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
  resultsActions: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  startOverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  startOverButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },

  bottomPadding: {
    height: SPACING.xxxl,
  },
});
