// Subscription Context
// Provides subscription state throughout the app

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';
import {
  initializePurchases,
  isPurchasesAvailable,
  loginUser,
  logoutUser,
  checkIsProUser,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementUrl,
  PurchaseResult,
} from '../services/purchases';
import {
  FeatureKey,
  FEATURES,
  DEV_MODE,
  getFeatureLimit,
} from '../config/subscriptions';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionContextValue {
  // Status
  isProUser: boolean;
  isPremium: boolean; // Alias for isProUser
  isLoading: boolean;
  isAvailable: boolean; // Whether IAP is configured and available

  // Offerings
  offerings: PurchasesOffering | null;

  // Actions
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  refreshStatus: () => Promise<void>;
  getManageUrl: () => Promise<string | null>;
  getManageSubscriptionUrl: () => Promise<string | null>; // Alias

  // Feature access helpers
  canAccessFeature: (feature: FeatureKey) => boolean;
  getLimit: (feature: FeatureKey) => number | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ============================================================================
// HOOK
// ============================================================================

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();

  // State
  const [isProUser, setIsProUser] = useState(DEV_MODE.BYPASS_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const success = await initializePurchases();
      setIsAvailable(success);
      setInitialized(true);

      if (!success) {
        // If not available, stop loading
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Handle auth changes
  useEffect(() => {
    if (!initialized) return;

    const handleAuthChange = async () => {
      if (!isPurchasesAvailable()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      if (user) {
        await loginUser(user.id);
      } else {
        await logoutUser();
      }

      // Refresh status after auth change
      await refreshStatusInternal();
      setIsLoading(false);
    };

    handleAuthChange();
  }, [user, initialized]);

  // Internal refresh function
  const refreshStatusInternal = async () => {
    if (!isPurchasesAvailable()) return;

    try {
      const [isPro, currentOfferings] = await Promise.all([
        checkIsProUser(),
        getOfferings(),
      ]);

      setIsProUser(isPro);
      setOfferings(currentOfferings);
    } catch (error) {
      logger.error('[SubscriptionContext] Refresh failed:', error);
    }
  };

  // Public refresh function
  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    await refreshStatusInternal();
    setIsLoading(false);
  }, []);

  // Purchase handler
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    setIsLoading(true);
    const result = await purchasePackage(pkg);

    if (result.success) {
      setIsProUser(true);
    }

    setIsLoading(false);
    return result;
  }, []);

  // Restore handler
  const restore = useCallback(async (): Promise<PurchaseResult> => {
    setIsLoading(true);
    const result = await restorePurchases();

    if (result.success) {
      setIsProUser(true);
    }

    setIsLoading(false);
    return result;
  }, []);

  // Get management URL
  const getManageUrl = useCallback(async (): Promise<string | null> => {
    return getManagementUrl();
  }, []);

  // Feature access check
  const canAccessFeature = useCallback((feature: FeatureKey): boolean => {
    const featureDef = FEATURES[feature];
    if (!featureDef) return false;

    // If feature doesn't require pro, everyone can access
    if (!featureDef.requiresPro) return true;

    // Otherwise, need to be pro
    return isProUser;
  }, [isProUser]);

  // Get feature limit
  const getLimit = useCallback((feature: FeatureKey): number | null => {
    return getFeatureLimit(feature, isProUser);
  }, [isProUser]);

  // Memoize context value
  const value = useMemo<SubscriptionContextValue>(() => ({
    isProUser,
    isPremium: isProUser, // Alias
    isLoading,
    isAvailable,
    offerings,
    purchase,
    restore,
    refreshStatus,
    getManageUrl,
    getManageSubscriptionUrl: getManageUrl, // Alias
    canAccessFeature,
    getLimit,
  }), [
    isProUser,
    isLoading,
    isAvailable,
    offerings,
    purchase,
    restore,
    refreshStatus,
    getManageUrl,
    canAccessFeature,
    getLimit,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export default SubscriptionProvider;
