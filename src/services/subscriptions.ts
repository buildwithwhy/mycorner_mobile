// Subscription Service
// Handles in-app purchases and subscriptions using RevenueCat

import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import {
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID,
  isDevelopment,
} from '../../config';

// Entitlement identifiers (configure these in RevenueCat dashboard)
export const ENTITLEMENTS = {
  PREMIUM: 'premium', // Main premium entitlement
} as const;

// Product identifiers (configure in App Store Connect / Google Play Console)
export const PRODUCTS = {
  MONTHLY: 'mycorner_premium_monthly',
  YEARLY: 'mycorner_premium_yearly',
} as const;

// Track if RevenueCat was successfully configured
let isConfigured = false;

// Check if RevenueCat is configured
export const isRevenueCatConfigured = (): boolean => isConfigured;

// Initialize RevenueCat - call early in app startup
export const initSubscriptions = async (): Promise<boolean> => {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    if (isDevelopment) {
      console.log('[Subscriptions] API key not configured, skipping initialization');
    }
    isConfigured = false;
    return false;
  }

  try {
    // Set log level for debugging
    if (isDevelopment) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure RevenueCat
    await Purchases.configure({ apiKey });
    isConfigured = true;

    if (isDevelopment) {
      console.log('[Subscriptions] RevenueCat initialized');
    }
    return true;
  } catch (error) {
    console.error('[Subscriptions] Failed to initialize RevenueCat:', error);
    isConfigured = false;
    return false;
  }
};

// Login user to RevenueCat (call after auth)
export const loginUser = async (userId: string): Promise<CustomerInfo | null> => {
  if (!isConfigured) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('[Subscriptions] Failed to login user:', error);
    return null;
  }
};

// Logout user from RevenueCat
export const logoutUser = async (): Promise<void> => {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('[Subscriptions] Failed to logout user:', error);
  }
};

// Get current customer info
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isConfigured) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[Subscriptions] Failed to get customer info:', error);
    return null;
  }
};

// Check if user has premium access
export const isPremium = async (): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
  } catch (error) {
    console.error('[Subscriptions] Failed to check premium status:', error);
    return false;
  }
};

// Get available offerings (subscription packages)
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('[Subscriptions] Failed to get offerings:', error);
    return null;
  }
};

// Purchase a package
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> => {
  if (!isConfigured) {
    return { success: false, customerInfo: null, error: 'Subscriptions not configured' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      success: !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM],
      customerInfo,
    };
  } catch (error: unknown) {
    // Check if user cancelled
    const purchaseError = error as { userCancelled?: boolean; message?: string };
    if (purchaseError.userCancelled) {
      return { success: false, customerInfo: null, error: 'Purchase cancelled' };
    }
    console.error('[Subscriptions] Purchase failed:', error);
    return {
      success: false,
      customerInfo: null,
      error: purchaseError.message || 'Purchase failed',
    };
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<{
  success: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}> => {
  if (!isConfigured) {
    return { success: false, customerInfo: null, error: 'Subscriptions not configured' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPremium = !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
    return {
      success: hasPremium,
      customerInfo,
      error: hasPremium ? undefined : 'No active subscriptions found',
    };
  } catch (error: unknown) {
    console.error('[Subscriptions] Restore failed:', error);
    const restoreError = error as { message?: string };
    return {
      success: false,
      customerInfo: null,
      error: restoreError.message || 'Failed to restore purchases',
    };
  }
};

// Get subscription management URL (for cancellation, etc.)
export const getManagementUrl = async (): Promise<string | null> => {
  if (!isConfigured) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  } catch (error) {
    console.error('[Subscriptions] Failed to get management URL:', error);
    return null;
  }
};

export default {
  initSubscriptions,
  isRevenueCatConfigured,
  loginUser,
  logoutUser,
  getCustomerInfo,
  isPremium,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementUrl,
  ENTITLEMENTS,
  PRODUCTS,
};
