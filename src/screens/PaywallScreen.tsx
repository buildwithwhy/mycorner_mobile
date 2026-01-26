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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesPackage } from 'react-native-purchases';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { trackPaywallViewed } from '../services/analytics';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../config';

type PaywallRouteParams = {
  Paywall: {
    source?: string;
  };
};

interface PaywallScreenProps {
  onClose?: () => void;
  source?: string; // Where the paywall was triggered from
}

// Premium features to display
const PREMIUM_FEATURES = [
  {
    icon: 'sparkles' as const,
    title: 'AI Neighborhood Matcher',
    description: 'Get personalized recommendations based on your lifestyle',
  },
  {
    icon: 'car' as const,
    title: 'Commute Calculator',
    description: 'See travel times from each neighborhood to your work',
  },
  {
    icon: 'options' as const,
    title: 'Personalized Scoring',
    description: 'Weight what matters to you and get custom scores',
  },
  {
    icon: 'git-compare' as const,
    title: 'Unlimited Comparisons',
    description: 'Compare as many neighborhoods as you want side by side',
  },
  {
    icon: 'people' as const,
    title: 'Shared Lists',
    description: 'Collaborate with your partner on finding the perfect place',
  },
  {
    icon: 'document-text' as const,
    title: 'Export Reports',
    description: 'Download PDF reports of your neighborhood comparisons',
  },
];

export default function PaywallScreen({ onClose, source: propSource }: PaywallScreenProps) {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PaywallRouteParams, 'Paywall'>>();
  const { user } = useAuth();
  const { offerings, isPremium, isLoading, purchase, restore } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Get source from props or route params
  const source = propSource || route.params?.source || 'unknown';

  // Handle close - use provided callback or navigation
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  // Track paywall view
  useEffect(() => {
    trackPaywallViewed(source);
  }, [source]);

  // Set default selected package to yearly (better value)
  useEffect(() => {
    if (offerings?.availablePackages) {
      const yearlyPkg = offerings.availablePackages.find((pkg) =>
        pkg.identifier.toLowerCase().includes('year')
      );
      const monthlyPkg = offerings.availablePackages.find((pkg) =>
        pkg.identifier.toLowerCase().includes('month')
      );
      setSelectedPackage(yearlyPkg || monthlyPkg || offerings.availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe to premium.', [
        { text: 'OK' },
      ]);
      return;
    }

    setPurchasing(true);
    const result = await purchase(selectedPackage);
    setPurchasing(false);

    if (result.success) {
      Alert.alert('Welcome to Premium!', 'You now have access to all premium features.', [
        { text: 'OK', onPress: handleClose },
      ]);
    } else if (result.error && result.error !== 'Purchase cancelled') {
      Alert.alert('Purchase Failed', result.error);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);

    if (result.success) {
      Alert.alert('Restored!', 'Your premium subscription has been restored.', [
        { text: 'OK', onPress: handleClose },
      ]);
    } else {
      Alert.alert('No Subscription Found', result.error || 'No active subscription to restore.');
    }
  };

  const getYearlySavings = () => {
    if (!offerings?.availablePackages) return null;

    const monthly = offerings.availablePackages.find((pkg) =>
      pkg.identifier.toLowerCase().includes('month')
    );
    const yearly = offerings.availablePackages.find((pkg) =>
      pkg.identifier.toLowerCase().includes('year')
    );

    if (!monthly || !yearly) return null;

    const monthlyAnnual = monthly.product.price * 12;
    const yearlyCost = yearly.product.price;
    const savings = Math.round(((monthlyAnnual - yearlyCost) / monthlyAnnual) * 100);

    return savings;
  };

  const yearlySavings = getYearlySavings();

  // If already premium, show success state
  if (isPremium) {
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
            You have access to all premium features. Enjoy!
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
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={20} color={COLORS.white} />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>Unlock Your Perfect Neighborhood</Text>
          <Text style={styles.subtitle}>
            Get personalized recommendations and powerful tools to find your ideal place to live
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : offerings?.availablePackages ? (
          <View style={styles.pricingSection}>
            {offerings.availablePackages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const isYearly = pkg.identifier.toLowerCase().includes('year');

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
                  <View style={styles.pricingContent}>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.pricingDetails}>
                      <Text style={styles.pricingTitle}>
                        {isYearly ? 'Yearly' : 'Monthly'}
                      </Text>
                      <Text style={styles.pricingPrice}>
                        {pkg.product.priceString}
                        <Text style={styles.pricingPeriod}>
                          /{isYearly ? 'year' : 'month'}
                        </Text>
                      </Text>
                      {isYearly && (
                        <Text style={styles.pricingSubtext}>
                          Just {(pkg.product.price / 12).toFixed(2)}/month
                        </Text>
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
            (!selectedPackage || purchasing) && styles.primaryButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              Start Premium
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
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

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Payment will be charged to your App Store account. Subscription automatically renews
          unless canceled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  titleSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.md,
  },
  premiumBadgeText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
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
  pricingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
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
