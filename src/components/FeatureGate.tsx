// FeatureGate Component
// Conditionally renders content based on feature access
// Shows sign-in prompt or upgrade prompt when access is denied

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { FeatureId, FEATURES, getUpgradeMessage } from '../utils/features';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface FeatureGateProps {
  feature: FeatureId;
  children: ReactNode;
  // What to render when access is denied (defaults to built-in prompt)
  fallback?: ReactNode;
  // Callback when sign-in is needed
  onSignInRequired?: () => void;
  // Callback when upgrade is needed (shows paywall)
  onUpgradeRequired?: () => void;
  // If true, renders children but disabled/locked
  renderLocked?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  onSignInRequired,
  onUpgradeRequired,
  renderLocked = false,
}) => {
  const { canAccess, requiresSignIn, requiresUpgrade } = useFeatureAccess();

  const hasAccess = canAccess(feature);

  // Has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Render locked version if requested
  if (renderLocked) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={24} color={COLORS.white} />
        </View>
        <View style={styles.lockedContent}>{children}</View>
      </View>
    );
  }

  // Determine which prompt to show
  if (requiresSignIn(feature)) {
    return (
      <SignInPrompt
        feature={feature}
        onSignIn={onSignInRequired}
      />
    );
  }

  if (requiresUpgrade(feature)) {
    return (
      <UpgradePrompt
        feature={feature}
        onUpgrade={onUpgradeRequired}
      />
    );
  }

  // Feature not available at all
  return null;
};

// Sign-in prompt component
interface SignInPromptProps {
  feature: FeatureId;
  onSignIn?: () => void;
}

const SignInPrompt: React.FC<SignInPromptProps> = ({ feature, onSignIn }) => {
  const featureConfig = FEATURES[feature];

  return (
    <View style={styles.promptContainer}>
      <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
      <Text style={styles.promptTitle}>Sign In Required</Text>
      <Text style={styles.promptMessage}>
        Sign in to {featureConfig?.name.toLowerCase() || 'use this feature'}.
      </Text>
      {onSignIn && (
        <TouchableOpacity style={styles.promptButton} onPress={onSignIn}>
          <Text style={styles.promptButtonText}>Sign In</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Upgrade prompt component
interface UpgradePromptProps {
  feature: FeatureId;
  onUpgrade?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, onUpgrade }) => {
  const featureConfig = FEATURES[feature];

  return (
    <View style={styles.promptContainer}>
      <View style={styles.premiumBadge}>
        <Ionicons name="star" size={24} color={COLORS.white} />
      </View>
      <Text style={styles.promptTitle}>{featureConfig?.name || 'Premium Feature'}</Text>
      <Text style={styles.promptMessage}>
        {featureConfig?.description || 'This is a premium feature.'}
      </Text>
      {onUpgrade && (
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
          <Ionicons name="star" size={16} color={COLORS.white} />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Inline upgrade prompt (for showing within existing UI)
interface InlineUpgradePromptProps {
  feature: FeatureId;
  onUpgrade?: () => void;
  compact?: boolean;
}

export const InlineUpgradePrompt: React.FC<InlineUpgradePromptProps> = ({
  feature,
  onUpgrade,
  compact = false,
}) => {
  const featureConfig = FEATURES[feature];

  if (compact) {
    return (
      <TouchableOpacity style={styles.inlinePromptCompact} onPress={onUpgrade}>
        <Ionicons name="lock-closed" size={14} color={COLORS.primary} />
        <Text style={styles.inlinePromptCompactText}>Premium</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.inlinePrompt} onPress={onUpgrade}>
      <Ionicons name="star" size={16} color={COLORS.primary} />
      <Text style={styles.inlinePromptText}>
        {featureConfig?.name || 'Premium Feature'} - Upgrade to unlock
      </Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
    </TouchableOpacity>
  );
};

// Limit reached prompt
interface LimitReachedPromptProps {
  feature: FeatureId;
  currentCount: number;
  limit: number;
  onUpgrade?: () => void;
}

export const LimitReachedPrompt: React.FC<LimitReachedPromptProps> = ({
  feature,
  currentCount,
  limit,
  onUpgrade,
}) => {
  return (
    <View style={styles.limitPrompt}>
      <Ionicons name="alert-circle" size={20} color={COLORS.accent} />
      <Text style={styles.limitPromptText}>
        You've reached the limit of {limit} for{' '}
        {FEATURES[feature]?.name.toLowerCase() || 'this feature'}
      </Text>
      {onUpgrade && (
        <TouchableOpacity onPress={onUpgrade}>
          <Text style={styles.limitPromptLink}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  promptContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.md,
  },
  premiumBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  promptTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
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
  promptButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  promptButtonText: {
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
  inlinePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  inlinePromptText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  inlinePromptCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  inlinePromptCompactText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  limitPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.md,
  },
  limitPromptText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
  },
  limitPromptLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default FeatureGate;
