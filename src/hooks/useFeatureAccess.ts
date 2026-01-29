// useFeatureAccess Hook
// Provides easy access to feature gating based on user's auth and subscription status

import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  UserTier,
  FeatureId,
  isFeatureAvailable,
  getFeatureLimit,
  hasExceededLimit,
  getComparisonLimit,
  FEATURES,
} from '../utils/features';

// TEMPORARY: Set to true to unlock all premium features for testing
// Set to false before production release
const DEV_UNLOCK_ALL_FEATURES = true;

interface FeatureAccessResult {
  // Current user tier
  tier: UserTier;

  // Check if a feature is available
  canAccess: (featureId: FeatureId) => boolean;

  // Get the limit for a feature (null if unlimited)
  getLimit: (featureId: FeatureId) => number | null;

  // Check if a limit has been exceeded
  isLimitExceeded: (featureId: FeatureId, currentCount: number) => boolean;

  // Convenience properties
  isPremium: boolean;
  isLoggedIn: boolean;
  comparisonLimit: number;

  // Check if user needs to sign in for a feature
  requiresSignIn: (featureId: FeatureId) => boolean;

  // Check if user needs to upgrade for a feature
  requiresUpgrade: (featureId: FeatureId) => boolean;
}

export const useFeatureAccess = (): FeatureAccessResult => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  // Determine user tier
  const tier: UserTier = useMemo(() => {
    // TEMPORARY: Unlock all features for testing
    if (DEV_UNLOCK_ALL_FEATURES) return 'premium';

    if (!user) return 'anonymous';
    if (isPremium) return 'premium';
    return 'free';
  }, [user, isPremium]);

  // Check if a feature is available
  const canAccess = useCallback(
    (featureId: FeatureId): boolean => {
      return isFeatureAvailable(featureId, tier);
    },
    [tier]
  );

  // Get the limit for a feature
  const getLimit = useCallback(
    (featureId: FeatureId): number | null => {
      return getFeatureLimit(featureId, tier);
    },
    [tier]
  );

  // Check if a limit has been exceeded
  const isLimitExceeded = useCallback(
    (featureId: FeatureId, currentCount: number): boolean => {
      return hasExceededLimit(featureId, tier, currentCount);
    },
    [tier]
  );

  // Check if user needs to sign in for a feature
  const requiresSignIn = useCallback(
    (featureId: FeatureId): boolean => {
      if (user) return false; // Already signed in
      const feature = FEATURES[featureId];
      if (!feature) return false;
      // Requires sign in if anonymous can't access but free can
      return feature.access.anonymous === false && feature.access.free !== false;
    },
    [user]
  );

  // Check if user needs to upgrade for a feature
  const requiresUpgrade = useCallback(
    (featureId: FeatureId): boolean => {
      if (isPremium) return false; // Already premium
      const feature = FEATURES[featureId];
      if (!feature) return false;
      // Requires upgrade if current tier can't access but premium can
      return !isFeatureAvailable(featureId, tier) && feature.access.premium !== false;
    },
    [tier, isPremium]
  );

  // Comparison limit for current tier
  const comparisonLimit = useMemo(() => {
    return getComparisonLimit(tier);
  }, [tier]);

  return {
    tier,
    canAccess,
    getLimit,
    isLimitExceeded,
    isPremium: DEV_UNLOCK_ALL_FEATURES || isPremium,
    isLoggedIn: !!user,
    comparisonLimit,
    requiresSignIn,
    requiresUpgrade,
  };
};

export default useFeatureAccess;
