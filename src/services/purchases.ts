// Purchase Service
// Handles in-app purchases using RevenueCat (react-native-purchases)
// This is a thin wrapper that provides a clean API for the rest of the app

import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  PurchasesError,
} from 'react-native-purchases';
import {
  ENTITLEMENTS,
  DEV_MODE,
  SubscriptionState,
  DEFAULT_SUBSCRIPTION_STATE,
} from '../config/subscriptions';
import {
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID,
} from '../../config';

// ============================================================================
// STATE
// ============================================================================

let isInitialized = false;
let initializationError: string | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the purchase system
 * Call this early in app startup (e.g., in App.tsx)
 */
export const initializePurchases = async (): Promise<boolean> => {
  if (isInitialized) {
    log('Already initialized');
    return true;
  }

  const apiKey = Platform.OS === 'ios'
    ? REVENUECAT_API_KEY_IOS
    : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    log('No API key configured - purchases disabled');
    initializationError = 'No API key configured';
    return false;
  }

  try {
    // Configure logging in dev
    if (DEV_MODE.VERBOSE_LOGGING) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Initialize RevenueCat
    await Purchases.configure({ apiKey });

    isInitialized = true;
    initializationError = null;
    log('Initialized successfully');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    initializationError = message;
    logError('Initialization failed', error);
    return false;
  }
};

/**
 * Check if purchases are available
 */
export const isPurchasesAvailable = (): boolean => {
  return isInitialized && !initializationError;
};

/**
 * Get initialization error if any
 */
export const getInitializationError = (): string | null => {
  return initializationError;
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Associate purchases with a user account
 * Call after user signs in
 */
export const loginUser = async (userId: string): Promise<CustomerInfo | null> => {
  if (!isInitialized) {
    log('Cannot login - not initialized');
    return null;
  }

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    log(`User logged in: ${userId}`);
    return customerInfo;
  } catch (error) {
    logError('Login failed', error);
    return null;
  }
};

/**
 * Disassociate purchases from current user
 * Call after user signs out
 */
export const logoutUser = async (): Promise<void> => {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
    log('User logged out');
  } catch (error) {
    logError('Logout failed', error);
  }
};

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

/**
 * Get current customer info from RevenueCat
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isInitialized) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    logError('Failed to get customer info', error);
    return null;
  }
};

/**
 * Check if user has active Pro subscription
 */
export const checkIsProUser = async (): Promise<boolean> => {
  if (DEV_MODE.BYPASS_SUBSCRIPTION) {
    return true;
  }

  if (!isInitialized) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
  } catch (error) {
    logError('Failed to check pro status', error);
    return false;
  }
};

/**
 * Get detailed subscription state
 */
export const getSubscriptionState = async (): Promise<SubscriptionState> => {
  if (DEV_MODE.BYPASS_SUBSCRIPTION) {
    return {
      ...DEFAULT_SUBSCRIPTION_STATE,
      status: 'active',
      isProUser: true,
    };
  }

  if (!isInitialized) {
    return DEFAULT_SUBSCRIPTION_STATE;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];

    if (!proEntitlement) {
      return DEFAULT_SUBSCRIPTION_STATE;
    }

    return {
      status: 'active',
      productId: proEntitlement.productIdentifier as any,
      expiresAt: proEntitlement.expirationDate
        ? new Date(proEntitlement.expirationDate)
        : null,
      willRenew: proEntitlement.willRenew,
      isProUser: true,
    };
  } catch (error) {
    logError('Failed to get subscription state', error);
    return DEFAULT_SUBSCRIPTION_STATE;
  }
};

// ============================================================================
// OFFERINGS & PRODUCTS
// ============================================================================

/**
 * Get available subscription offerings
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isInitialized) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    logError('Failed to get offerings', error);
    return null;
  }
};

// ============================================================================
// PURCHASES
// ============================================================================

export interface PurchaseResult {
  success: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
  cancelled?: boolean;
}

/**
 * Purchase a subscription package
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<PurchaseResult> => {
  if (!isInitialized) {
    return {
      success: false,
      customerInfo: null,
      error: 'Purchases not initialized',
    };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];

    log(`Purchase completed: ${pkg.identifier}, isPro: ${isPro}`);

    return {
      success: isPro,
      customerInfo,
    };
  } catch (error) {
    const purchasesError = error as PurchasesError;

    // User cancelled - not an error
    if (purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      log('Purchase cancelled by user');
      return {
        success: false,
        customerInfo: null,
        cancelled: true,
      };
    }

    logError('Purchase failed', error);
    return {
      success: false,
      customerInfo: null,
      error: purchasesError.message || 'Purchase failed',
    };
  }
};

/**
 * Restore previous purchases
 * Required by App Store guidelines
 */
export const restorePurchases = async (): Promise<PurchaseResult> => {
  if (!isInitialized) {
    return {
      success: false,
      customerInfo: null,
      error: 'Purchases not initialized',
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];

    log(`Restore completed, isPro: ${isPro}`);

    return {
      success: isPro,
      customerInfo,
      error: isPro ? undefined : 'No active subscription found',
    };
  } catch (error) {
    logError('Restore failed', error);
    const purchasesError = error as PurchasesError;
    return {
      success: false,
      customerInfo: null,
      error: purchasesError.message || 'Failed to restore purchases',
    };
  }
};

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get URL to manage subscription (cancel, change plan, etc.)
 */
export const getManagementUrl = async (): Promise<string | null> => {
  if (!isInitialized) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  } catch (error) {
    logError('Failed to get management URL', error);
    return null;
  }
};

// ============================================================================
// HELPERS
// ============================================================================

import logger from '../utils/logger';

function log(message: string): void {
  if (DEV_MODE.VERBOSE_LOGGING) {
    logger.log(`[Purchases] ${message}`);
  }
}

function logError(message: string, error: unknown): void {
  logger.error(`[Purchases] ${message}:`, error);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializePurchases,
  isPurchasesAvailable,
  getInitializationError,
  loginUser,
  logoutUser,
  getCustomerInfo,
  checkIsProUser,
  getSubscriptionState,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementUrl,
};
