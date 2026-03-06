import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';
import { PremiumBadge } from '../FeatureGate';
import type { MatchReason } from '../../utils/personalizedScoring';

interface DetailMatchSectionProps {
  matchPercentage: number;
  matchReasons: MatchReason[];
  canAccessScores: boolean;
  hasCustomPreferences: boolean;
  onNavigatePaywall: () => void;
}

function DetailMatchSectionInner({
  matchPercentage,
  matchReasons,
  canAccessScores,
  hasCustomPreferences,
  onNavigatePaywall,
}: DetailMatchSectionProps) {
  if (!hasCustomPreferences) {
    return null;
  }

  // Premium user with access: show match score
  if (canAccessScores) {
    return (
      <View style={styles.matchScoreSection}>
        <View style={styles.matchScoreHeader}>
          <View style={styles.matchScoreBadge}>
            <Ionicons name="sparkles" size={18} color={COLORS.white} />
            <Text style={styles.matchScoreValue}>
              {matchPercentage}%
            </Text>
          </View>
          <View style={styles.matchScoreTextContainer}>
            <View style={styles.matchScoreTitleRow}>
              <Text style={styles.matchScoreTitle}>Your Match</Text>
              <PremiumBadge />
            </View>
            <Text style={styles.matchScoreSubtitle}>Based on your preferences</Text>
          </View>
        </View>
        {matchReasons.length > 0 && (
          <View style={styles.matchReasons}>
            <Text style={styles.matchReasonsTitle}>Why it matches:</Text>
            {matchReasons.map((reason) => (
              <View key={reason.criterion} style={styles.matchReasonItem}>
                <Ionicons
                  name={reason.isStrength ? 'checkmark-circle' : 'ellipse'}
                  size={16}
                  color={reason.isStrength ? COLORS.success : COLORS.primary}
                />
                <Text style={styles.matchReasonText}>
                  {reason.isStrength ? 'Strong' : 'Good'} {reason.label.toLowerCase()}
                  {reason.userWeight >= 70 && ' (high priority)'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Non-premium user with preferences: show upgrade prompt
  return (
    <TouchableOpacity
      style={styles.matchScoreUpgradePrompt}
      onPress={onNavigatePaywall}
    >
      <View style={styles.matchScoreUpgradeIcon}>
        <Ionicons name="sparkles" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.matchScoreUpgradeText}>
        <Text style={styles.matchScoreUpgradeTitle}>See Your Match Score</Text>
        <Text style={styles.matchScoreUpgradeSubtitle}>
          Unlock personalized insights for this neighborhood
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  );
}

export const DetailMatchSection = React.memo(DetailMatchSectionInner);

const styles = StyleSheet.create({
  matchScoreSection: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  matchScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  matchScoreValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  matchScoreTextContainer: {
    flex: 1,
  },
  matchScoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  matchScoreTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  matchScoreSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  matchReasons: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
  },
  matchReasonsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
  },
  matchReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  matchReasonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
  },
  matchScoreUpgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.small,
  },
  matchScoreUpgradeIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  matchScoreUpgradeText: {
    flex: 1,
  },
  matchScoreUpgradeTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  matchScoreUpgradeSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
});
