import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { neighborhoods } from '../data/neighborhoods';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

const PRIVACY_POLICY_URL = Constants.expoConfig?.extra?.privacyPolicyUrl || 'https://kallidao.com/productlab/mycorner/privacy';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { comparison, status, getNeighborhoodsByStatus, destinations } = useApp();
  const { user, signOut } = useAuth();
  const { isPremium, getManageSubscriptionUrl } = useSubscription();
  const { tier } = useFeatureAccess();

  const shortlist = getNeighborhoodsByStatus('shortlist');
  const wantToVisit = getNeighborhoodsByStatus('want_to_visit');
  const visited = getNeighborhoodsByStatus('visited');
  const livingHere = getNeighborhoodsByStatus('living_here');
  const ruledOut = getNeighborhoodsByStatus('ruled_out');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleManageSubscription = async () => {
    const url = await getManageSubscriptionUrl();
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert('Unable to open', 'Could not open subscription management. Please try again later.');
    }
  };

  const renderPremiumCard = () => {
    if (isPremium) {
      // Premium user - show status
      return (
        <View style={styles.premiumCard}>
          <View style={styles.premiumBadgeContainer}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={20} color={COLORS.white} />
            </View>
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Premium Member</Text>
              <Text style={styles.premiumSubtitle}>You have access to all features</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
            <Ionicons name="open-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    // Non-premium user - show upgrade CTA
    return (
      <TouchableOpacity
        style={styles.upgradeCard}
        onPress={() => navigation.navigate('Paywall' as never, { source: 'profile' } as never)}
      >
        <View style={styles.upgradeHeader}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="star" size={28} color={COLORS.white} />
          </View>
          <View style={styles.upgradeTextContainer}>
            <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            <Text style={styles.upgradeSubtitle}>Unlock all features</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </View>
        <View style={styles.upgradeFeatures}>
          <View style={styles.upgradeFeatureItem}>
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
            <Text style={styles.upgradeFeatureText}>Unlimited comparisons</Text>
          </View>
          <View style={styles.upgradeFeatureItem}>
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
            <Text style={styles.upgradeFeatureText}>Unlimited destinations</Text>
          </View>
          <View style={styles.upgradeFeatureItem}>
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
            <Text style={styles.upgradeFeatureText}>AI neighborhood matcher</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatusList = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    ids: string[]
  ) => {
    if (ids.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={24} color={color} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{ids.length}</Text>
        </View>
        <View style={styles.list}>
          {ids.map((id) => {
            const neighborhood = neighborhoods.find((n) => n.id === id);
            if (!neighborhood) return null;
            return (
              <TouchableOpacity
                key={id}
                style={styles.listItem}
                onPress={() => navigation.navigate('Detail', { neighborhood })}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{neighborhood.name}</Text>
                  <Text style={styles.listItemBorough}>{neighborhood.borough}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Lists</Text>
        <Text style={styles.subtitle}>Track your neighborhood journey</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {user && (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={32} color={COLORS.white} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {user.user_metadata?.full_name || 'User'}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {renderPremiumCard()}

          <TouchableOpacity
            style={styles.destinationsCard}
            onPress={() => navigation.navigate('Destinations')}
          >
            <View style={styles.destinationsHeader}>
              <View style={styles.destinationsIconContainer}>
                <Ionicons name="map" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.destinationsTextContainer}>
                <Text style={styles.destinationsTitle}>My Destinations</Text>
                <Text style={styles.destinationsSubtitle}>
                  {destinations.length === 0
                    ? 'Add work, school, or regular places'
                    : `${destinations.length} destination${destinations.length !== 1 ? 's' : ''} added`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
            </View>
          </TouchableOpacity>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="bookmark" size={28} color={COLORS.primary} />
              <Text style={styles.statNumber}>{Object.keys(status).length}</Text>
              <Text style={styles.statLabel}>Saved Places</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="git-compare" size={28} color={COLORS.info} />
              <Text style={styles.statNumber}>{comparison.length}</Text>
              <Text style={styles.statLabel}>Comparing</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={28} color={COLORS.accent} />
              <Text style={styles.statNumber}>{shortlist.length}</Text>
              <Text style={styles.statLabel}>Shortlist</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <Text style={styles.statNumber}>{visited.length}</Text>
              <Text style={styles.statLabel}>Visited</Text>
            </View>
          </View>

          {renderStatusList('Shortlist', 'star', COLORS.accent, shortlist)}
          {renderStatusList('Want to Visit', 'bookmark', COLORS.info, wantToVisit)}
          {renderStatusList('Visited', 'checkmark-circle', COLORS.primary, visited)}
          {renderStatusList('Living Here', 'home', COLORS.success, livingHere)}
          {renderStatusList('Ruled Out', 'close-circle', COLORS.error, ruledOut)}

          {shortlist.length === 0 && wantToVisit.length === 0 && visited.length === 0 && livingHere.length === 0 && ruledOut.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptyText}>
                Start exploring neighborhoods and set their status to organize your search
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray400} />
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerVersion}>Version {APP_VERSION}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  signOutText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.error,
  },
  premiumCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  premiumBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  premiumBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
  },
  manageButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  upgradeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  upgradeSubtitle: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
  },
  upgradeFeatures: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  upgradeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  upgradeFeatureText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '500',
  },
  destinationsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  destinationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  destinationsTextContainer: {
    flex: 1,
  },
  destinationsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  destinationsSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: FONT_SIZES.huge,
    fontWeight: 'bold',
    color: COLORS.gray900,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
    flex: 1,
  },
  sectionCount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  list: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  listItemBorough: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  footerLinkText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  footerVersion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
    marginTop: SPACING.xs,
  },
});
