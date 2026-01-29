// Subscription Context
// Provides subscription state and methods throughout the app

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesPackage, PurchasesOffering } from 'react-native-purchases';

// TEMPORARY: Set to true to unlock all premium features for testing
// Must match the flag in useFeatureAccess.ts
// Set to false before production release
const DEV_UNLOCK_ALL_FEATURES = true;
import {
  initSubscriptions,
  isRevenueCatConfigured,
  loginUser,
  logoutUser,
  getCustomerInfo,
  isPremium as checkIsPremium,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementUrl,
  ENTITLEMENTS,
} from '../services/subscriptions';
import { useAuth } from './AuthContext';
import { trackSubscriptionStarted, trackSubscriptionCancelled } from '../services/analytics';

interface SubscriptionContextType {
  // State
  isPremium: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;

  // Actions
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
  getManageSubscriptionUrl: () => Promise<string | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isLoading: true,
  customerInfo: null,
  offerings: null,
  purchase: async () => ({ success: false }),
  restore: async () => ({ success: false }),
  refreshStatus: async () => {},
  getManageSubscriptionUrl: async () => null,
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const init = async () => {
      await initSubscriptions();
      setInitialized(true);
      // If not configured, set loading to false immediately
      if (!isRevenueCatConfigured()) {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Handle user auth changes
  useEffect(() => {
    if (!initialized) return;

    // Skip if RevenueCat is not configured
    if (!isRevenueCatConfigured()) {
      setIsLoading(false);
      return;
    }

    const handleAuth = async () => {
      setIsLoading(true);

      if (user) {
        // Login to RevenueCat with user ID
        await loginUser(user.id);
      } else {
        // Logout from RevenueCat
        await logoutUser();
      }

      // Refresh subscription status
      await refreshStatus();
      setIsLoading(false);
    };

    handleAuth();
  }, [user, initialized]);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    // Skip if RevenueCat is not configured
    if (!isRevenueCatConfigured()) {
      return;
    }

    try {
      const [info, premium, currentOfferings] = await Promise.all([
        getCustomerInfo(),
        checkIsPremium(),
        getOfferings(),
      ]);

      setCustomerInfo(info);
      setIsPremium(premium);
      setOfferings(currentOfferings);
    } catch (error) {
      console.error('[SubscriptionContext] Failed to refresh status:', error);
    }
  }, []);

  // Purchase a package
  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);

      const result = await purchasePackage(pkg);

      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        setIsPremium(!!result.customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]);

        // Track subscription started
        const price = pkg.product.price;
        const plan = pkg.identifier.includes('yearly') ? 'yearly' : 'monthly';
        trackSubscriptionStarted(plan, price);
      }

      setIsLoading(false);
      return { success: result.success, error: result.error };
    },
    []
  );

  // Restore purchases
  const restore = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const result = await restorePurchases();

    if (result.success && result.customerInfo) {
      setCustomerInfo(result.customerInfo);
      setIsPremium(!!result.customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]);
    }

    setIsLoading(false);
    return { success: result.success, error: result.error };
  }, []);

  // Get subscription management URL
  const getManageSubscriptionUrl = useCallback(async (): Promise<string | null> => {
    return getManagementUrl();
  }, []);

  const value: SubscriptionContextType = {
    isPremium: DEV_UNLOCK_ALL_FEATURES || isPremium,
    isLoading,
    customerInfo,
    offerings,
    purchase,
    restore,
    refreshStatus,
    getManageSubscriptionUrl,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
