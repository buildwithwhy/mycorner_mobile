// useFeatureAccess Hook
// Data-driven feature access checks based on subscription status and FEATURES config

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FeatureKey, FEATURES } from '../config/subscriptions';

interface UseFeatureAccessReturn {
  // Status
  isProUser: boolean;
  isPremium: boolean;
  isLoggedIn: boolean;

  // Limits
  comparisonLimit: number;

  // Feature checks
  canAccess: (feature: FeatureKey) => boolean;
  getLimit: (feature: FeatureKey) => number | null;
  isLimitExceeded: (feature: FeatureKey, currentCount: number) => boolean;

  // Requirement checks
  requiresLogin: (feature: FeatureKey) => boolean;
  requiresUpgrade: (feature: FeatureKey) => boolean;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { user } = useAuth();
  const { isProUser, canAccessFeature, getLimit } = useSubscription();

  const isLoggedIn = !!user;

  // Derive comparison limit from FEATURES config
  const comparisonLimit = useMemo(() => {
    const feature = FEATURES.unlimited_comparisons;
    if (isProUser) return feature.proLimit ?? Infinity;
    return feature.freeLimit ?? 2;
  }, [isProUser]);

  // Check if user can access a feature (data-driven)
  const canAccess = useCallback((feature: FeatureKey): boolean => {
    const featureDef = FEATURES[feature];
    if (!featureDef) return false;

    // Check login requirement from config
    if (featureDef.requiresLogin && !isLoggedIn) {
      return false;
    }

    // Pro check delegated to subscription context
    return canAccessFeature(feature);
  }, [isLoggedIn, canAccessFeature]);

  // Check if limit is exceeded for a feature
  const isLimitExceeded = useCallback((feature: FeatureKey, currentCount: number): boolean => {
    const limit = getLimit(feature);
    if (limit === null) return false;
    return currentCount >= limit;
  }, [getLimit]);

  // Check if feature requires login (data-driven)
  const requiresLogin = useCallback((feature: FeatureKey): boolean => {
    if (isLoggedIn) return false;
    return FEATURES[feature]?.requiresLogin ?? false;
  }, [isLoggedIn]);

  // Check if feature requires upgrade
  const requiresUpgrade = useCallback((feature: FeatureKey): boolean => {
    if (isProUser) return false;
    return FEATURES[feature]?.requiresPro ?? false;
  }, [isProUser]);

  return {
    isProUser,
    isPremium: isProUser,
    isLoggedIn,
    comparisonLimit,
    canAccess,
    getLimit,
    isLimitExceeded,
    requiresLogin,
    requiresUpgrade,
  };
}

export default useFeatureAccess;
