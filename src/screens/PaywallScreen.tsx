// Paywall Screen
// Displays subscription options and handles purchases

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesPackage, PACKAGE_TYPE } from 'react-native-purchases';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { getPremiumFeatures, PRODUCTS } from '../config/subscriptions';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../config';

// ============================================================================
// PACKAGE TYPE HELPERS
// Uses RevenueCat's native package types for reliable detection
// ============================================================================

type PackageInfo = {
  type: 'monthly' | 'yearly' | 'lifetime' | 'other';
  label: string;
  periodLabel: string;
};

const getPackageInfo = (pkg: PurchasesPackage): PackageInfo => {
  // First try RevenueCat's native package type (most reliable)
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return { type: 'monthly', label: 'Monthly', periodLabel: '/month' };
    case PACKAGE_TYPE.ANNUAL:
      return { type: 'yearly', label: 'Yearly', periodLabel: '/year' };
    case PACKAGE_TYPE.LIFETIME:
      return { type: 'lifetime', label: 'Lifetime', periodLabel: '' };
    default:
      // Fallback to identifier matching for custom packages or test mode
      const id = pkg.identifier.toLowerCase();
      if (id.includes('year') || id.includes('annual')) {
        return { type: 'yearly', label: 'Yearly', periodLabel: '/year' };
      }
      if (id.includes('lifetime')) {
        return { type: 'lifetime', label: 'Lifetime', periodLabel: '' };
      }
      // Default to monthly
      return { type: 'monthly', label: 'Monthly', periodLabel: '/month' };
  }
};

// ============================================================================
// TYPES
// ============================================================================

type PaywallRouteParams = {
  Paywall: {
    source?: string;
    feature?: string;
  };
};

interface PaywallScreenProps {
  onClose?: () => void;
  source?: string;
}

// ============================================================================
// PREMIUM FEATURES DISPLAY
// ============================================================================

const FEATURE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'AI Neighborhood Matcher': 'sparkles',
  'Unlimited Comparisons': 'git-compare',
  'Personalized Scoring': 'options',
  'Unlimited Destinations': 'location',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaywallScreen({ onClose, source: propSource }: PaywallScreenProps) {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PaywallRouteParams, 'Paywall'>>();
  const { user } = useAuth();
  const { offerings, isProUser, isLoading, isAvailable, purchase, restore } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const source = propSource || route.params?.source || 'unknown';
  const proFeatures = getPremiumFeatures();

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  // Set default package to yearly (best value)
  useEffect(() => {
    if (offerings?.availablePackages) {
      const yearly = offerings.availablePackages.find(
        (pkg) => getPackageInfo(pkg).type === 'yearly'
      );
      const monthly = offerings.availablePackages.find(
        (pkg) => getPackageInfo(pkg).type === 'monthly'
      );
      setSelectedPackage(yearly || monthly || offerings.availablePackages[0]);
    }
  }, [offerings]);

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedPackage) return;

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to subscribe to Premium.',
        [{ text: 'OK' }]
      );
      return;
    }

    setPurchasing(true);
    const result = await purchase(selectedPackage);
    setPurchasing(false);

    if (result.success) {
      Alert.alert(
        'Welcome to Premium!',
        'You now have access to all Premium features.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } else if (result.error && !result.cancelled) {
      Alert.alert('Purchase Failed', result.error);
    }
  };

  // Handle restore
  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);

    if (result.success) {
      Alert.alert(
        'Restored!',
        'Your Premium subscription has been restored.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } else {
      Alert.alert(
        'No Subscription Found',
        result.error || 'No active subscription to restore.'
      );
    }
  };

  // Calculate yearly savings compared to monthly
  const getYearlySavings = (): number | null => {
    if (!offerings?.availablePackages) return null;

    const monthly = offerings.availablePackages.find(
      (pkg) => getPackageInfo(pkg).type === 'monthly'
    );
    const yearly = offerings.availablePackages.find(
      (pkg) => getPackageInfo(pkg).type === 'yearly'
    );

    if (!monthly || !yearly) return null;

    const monthlyAnnual = monthly.product.price * 12;
    const yearlyCost = yearly.product.price;
    return Math.round(((monthlyAnnual - yearlyCost) / monthlyAnnual) * 100);
  };

  const yearlySavings = getYearlySavings();

  // Already pro - show success
  if (isProUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.gray500} />
          </TouchableOpacity>
        </View>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          <Text style={styles.successTitle}>You're Premium!</Text>
          <Text style={styles.successMessage}>
            You have access to all Premium features. Enjoy!
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.proBadge}>
            <Ionicons name="star" size={20} color={COLORS.white} />
            <Text style={styles.proBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>Find Your Perfect Neighborhood</Text>
          <Text style={styles.subtitle}>
            Get personalized recommendations and powerful tools to find your ideal place
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {proFeatures.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name={FEATURE_ICONS[feature.name] || 'checkmark'}
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.name}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : !isAvailable ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Subscriptions are not available in this build.
              {__DEV__ && '\n\nDev mode: All features unlocked for testing.'}
            </Text>
          </View>
        ) : offerings?.availablePackages ? (
          <View style={styles.pricingSection}>
            {offerings.availablePackages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const pkgInfo = getPackageInfo(pkg);
              const isYearly = pkgInfo.type === 'yearly';
              const isLifetime = pkgInfo.type === 'lifetime';

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.pricingOption, isSelected && styles.pricingOptionSelected]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  {isYearly && yearlySavings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>Save {yearlySavings}%</Text>
                    </View>
                  )}
                  {isLifetime && (
                    <View style={[styles.savingsBadge, styles.lifetimeBadge]}>
                      <Text style={styles.savingsText}>Best Value</Text>
                    </View>
                  )}
                  <View style={styles.pricingContent}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.pricingDetails}>
                      <Text style={styles.pricingTitle}>{pkgInfo.label}</Text>
                      <Text style={styles.pricingPrice}>
                        {pkg.product.priceString}
                        {pkgInfo.periodLabel && (
                          <Text style={styles.pricingPeriod}>{pkgInfo.periodLabel}</Text>
                        )}
                      </Text>
                      {isYearly && (
                        <Text style={styles.pricingSubtext}>
                          Just {pkg.product.currencyCode} {(pkg.product.price / 12).toFixed(2)}/month
                        </Text>
                      )}
                      {isLifetime && (
                        <Text style={styles.pricingSubtext}>One-time purchase, forever yours</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Unable to load subscription options. Please try again later.
            </Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!selectedPackage || purchasing || !isAvailable) && styles.primaryButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing || !isAvailable}
        >
          {purchasing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isAvailable ? 'Start Premium' : 'Not Available'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        {isAvailable && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Legal */}
        <View style={styles.legalSection}>
          {TERMS_OF_SERVICE_URL && (
            <>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>|</Text>
            </>
          )}
          {PRIVACY_POLICY_URL && (
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
          Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  // Title
  titleSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.md,
  },
  proBadgeText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Features
  featuresSection: {
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    lineHeight: 18,
  },

  // Pricing
  pricingSection: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  pricingOption: {
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  pricingOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  savingsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  savingsText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  lifetimeBadge: {
    backgroundColor: COLORS.primary,
  },
  pricingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  pricingDetails: {
    flex: 1,
  },
  pricingTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  pricingPrice: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  pricingPeriod: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.gray500,
  },
  pricingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },

  // Loading/Error
  loader: {
    marginVertical: SPACING.xl,
  },
  errorContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.gray500,
    textAlign: 'center',
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },

  // Legal
  legalSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  legalLink: {
    color: COLORS.gray500,
    fontSize: FONT_SIZES.sm,
  },
  legalDivider: {
    color: COLORS.gray300,
    marginHorizontal: SPACING.sm,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: SPACING.xl,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  successMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
});
