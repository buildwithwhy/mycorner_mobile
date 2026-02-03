// FeatureGate Component
// Conditionally renders content based on feature access

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { FeatureKey, FEATURES } from '../config/subscriptions';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

// ============================================================================
// MAIN FEATURE GATE
// ============================================================================

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  onLoginRequired?: () => void;
  onUpgradeRequired?: () => void;
  // If true, shows blurred/locked version instead of replacing
  showLocked?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  onLoginRequired,
  onUpgradeRequired,
  showLocked = false,
}: FeatureGateProps) {
  const { canAccess, requiresLogin, requiresUpgrade } = useFeatureAccess();

  // Has access - render children
  if (canAccess(feature)) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show locked overlay
  if (showLocked) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={24} color={COLORS.white} />
        </View>
        <View style={styles.lockedContent}>{children}</View>
      </View>
    );
  }

  // Show login prompt
  if (requiresLogin(feature)) {
    return <LoginPrompt feature={feature} onPress={onLoginRequired} />;
  }

  // Show upgrade prompt
  if (requiresUpgrade(feature)) {
    return <UpgradePrompt feature={feature} onPress={onUpgradeRequired} />;
  }

  return null;
}

// ============================================================================
// LOGIN PROMPT
// ============================================================================

interface LoginPromptProps {
  feature: FeatureKey;
  onPress?: () => void;
}

function LoginPrompt({ feature, onPress }: LoginPromptProps) {
  const featureConfig = FEATURES[feature];

  return (
    <View style={styles.promptContainer}>
      <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
      <Text style={styles.promptTitle}>Sign In Required</Text>
      <Text style={styles.promptMessage}>
        Sign in to {featureConfig?.name.toLowerCase() || 'use this feature'}.
      </Text>
      {onPress && (
        <TouchableOpacity style={styles.primaryButton} onPress={onPress}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// UPGRADE PROMPT
// ============================================================================

interface UpgradePromptProps {
  feature: FeatureKey;
  onPress?: () => void;
}

function UpgradePrompt({ feature, onPress }: UpgradePromptProps) {
  const featureConfig = FEATURES[feature];

  return (
    <View style={styles.promptContainer}>
      <View style={styles.proBadge}>
        <Ionicons name="star" size={24} color={COLORS.white} />
      </View>
      <Text style={styles.promptTitle}>{featureConfig?.name || 'Premium Feature'}</Text>
      <Text style={styles.promptMessage}>
        {featureConfig?.description || 'This is a Premium feature.'}
      </Text>
      {onPress && (
        <TouchableOpacity style={styles.upgradeButton} onPress={onPress}>
          <Ionicons name="star" size={16} color={COLORS.white} />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// INLINE UPGRADE PROMPT (for embedding in existing UI)
// ============================================================================

interface InlineUpgradeProps {
  feature: FeatureKey;
  onPress?: () => void;
  compact?: boolean;
}

export function InlineUpgradePrompt({ feature, onPress, compact = false }: InlineUpgradeProps) {
  const featureConfig = FEATURES[feature];

  if (compact) {
    return (
      <TouchableOpacity style={styles.inlineCompact} onPress={onPress}>
        <Ionicons name="lock-closed" size={14} color={COLORS.primary} />
        <Text style={styles.inlineCompactText}>Premium</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.inlineFull} onPress={onPress}>
      <Ionicons name="star" size={16} color={COLORS.primary} />
      <Text style={styles.inlineFullText}>
        {featureConfig?.name || 'Premium Feature'} - Upgrade to unlock
      </Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// LIMIT REACHED PROMPT
// ============================================================================

interface LimitReachedProps {
  feature: FeatureKey;
  currentCount: number;
  limit: number;
  onUpgrade?: () => void;
}

export function LimitReachedPrompt({
  feature,
  currentCount,
  limit,
  onUpgrade,
}: LimitReachedProps) {
  const featureConfig = FEATURES[feature];

  return (
    <View style={styles.limitPrompt}>
      <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
      <Text style={styles.limitText}>
        You've used {currentCount} of {limit}{' '}
        {featureConfig?.name.toLowerCase() || 'items'}
      </Text>
      {onUpgrade && (
        <TouchableOpacity onPress={onUpgrade}>
          <Text style={styles.limitLink}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// PRO BADGE (for showing on UI elements)
// ============================================================================

export function PremiumBadge() {
  return (
    <View style={styles.proBadgeSmall}>
      <Ionicons name="star" size={10} color={COLORS.white} />
      <Text style={styles.proBadgeSmallText}>PREMIUM</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Locked overlay
  lockedContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lockedContent: {
    opacity: 0.5,
  },

  // Prompt container
  promptContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.md,
  },
  promptTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  promptMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },

  // Premium badge
  proBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  proBadgeSmallText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },

  // Inline prompts
  inlineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  inlineCompactText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  inlineFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  inlineFullText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Limit prompt
  limitPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.md,
  },
  limitText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
  },
  limitLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default FeatureGate;
