// useFeatureAccess Hook
// Simple hook for checking feature access based on subscription status

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FeatureKey, FEATURES, UserTier, getComparisonLimit } from '../config/subscriptions';

interface UseFeatureAccessReturn {
  // Status
  isProUser: boolean;
  isPremium: boolean; // Alias for isProUser
  isLoggedIn: boolean;
  tier: UserTier;

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

  // Determine user tier
  const tier: UserTier = useMemo(() => {
    if (!user) return 'anonymous';
    if (isProUser) return 'premium';
    return 'free';
  }, [user, isProUser]);

  // Get comparison limit for current tier
  const comparisonLimit = useMemo(() => getComparisonLimit(tier), [tier]);

  // Check if user can access a feature
  const canAccess = useCallback((feature: FeatureKey): boolean => {
    const featureDef = FEATURES[feature];
    if (!featureDef) return false;

    // Some features require login (like save_places, add_notes)
    // These are defined as not requiring pro but needing an account
    if (feature === 'save_places' || feature === 'add_notes' || feature === 'add_photos') {
      return isLoggedIn;
    }

    return canAccessFeature(feature);
  }, [isLoggedIn, canAccessFeature]);

  // Check if limit is exceeded for a feature
  const isLimitExceeded = useCallback((feature: FeatureKey, currentCount: number): boolean => {
    const limit = getLimit(feature);
    if (limit === null) return false; // No limit
    return currentCount >= limit;
  }, [getLimit]);

  // Check if feature requires login
  const requiresLogin = useCallback((feature: FeatureKey): boolean => {
    if (isLoggedIn) return false;

    // Features that need login but not pro
    const loginRequired = ['save_places', 'add_notes', 'add_photos'];
    return loginRequired.includes(feature);
  }, [isLoggedIn]);

  // Check if feature requires upgrade
  const requiresUpgrade = useCallback((feature: FeatureKey): boolean => {
    if (isProUser) return false;

    const featureDef = FEATURES[feature];
    return featureDef?.requiresPro ?? false;
  }, [isProUser]);

  return {
    isProUser,
    isPremium: isProUser, // Alias
    isLoggedIn,
    tier,
    comparisonLimit,
    canAccess,
    getLimit,
    isLimitExceeded,
    requiresLogin,
    requiresUpgrade,
  };
}

export default useFeatureAccess;
