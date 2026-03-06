import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useDestinations, TransportMode, useCity } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getTransportModeInfo } from '../utils/commute';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import AddDestinationModal from '../components/AddDestinationModal';

export default function DestinationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const { cityDestinations: destinations, addDestination, removeDestination } = useDestinations();
  const { selectedCity } = useCity();
  const { isPremium, isLoggedIn, getLimit } = useFeatureAccess();

  const destinationLimit = isLoggedIn ? (getLimit('unlimited_destinations') ?? Infinity) : 0;
  const canAddMore = destinations.length < destinationLimit;
  const [showAddModal, setShowAddModal] = useState(false);

  // Google Places query config based on selected city
  const placesQueryConfig = useMemo(() => {
    if (selectedCity.id === 'new-york') {
      return {
        components: 'country:us',
        location: '40.7128,-74.0060',
        radius: 50000,
      };
    }
    // Default to London
    return {
      components: 'country:gb',
      location: '51.5074,-0.1278',
      radius: 30000,
    };
  }, [selectedCity.id]);

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.xl }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>My Destinations</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.signInPrompt}>
          <View style={styles.signInIconContainer}>
            <Ionicons name="location" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.signInTitle}>Sign in to add destinations</Text>
          <Text style={styles.signInText}>
            Create a free account to save your work, school, and other destinations to compare commute times.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xl }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>My Destinations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.description}>
            Add places you visit regularly in {selectedCity.name} to see commute information from each neighborhood
            {!isPremium && ` (${destinations.length}/${destinationLimit} on free plan)`}
          </Text>

          {destinations.length > 0 ? (
            <>
              {destinations.map((destination) => {
                const modeInfo = getTransportModeInfo(destination.transportMode || 'transit');
                return (
                <View key={destination.id} style={styles.destinationCard}>
                  <View style={styles.destinationIcon}>
                    <Ionicons name={modeInfo.icon as keyof typeof Ionicons.glyphMap} size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.destinationInfo}>
                    <Text style={styles.destinationLabel}>{destination.label}</Text>
                    <Text style={styles.destinationAddress}>{destination.address}</Text>
                    <Text style={styles.destinationTransport}>{modeInfo.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      Alert.alert(
                        'Remove Destination',
                        `Remove "${destination.label}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeDestination(destination.id) },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>No destinations yet</Text>
              <Text style={styles.emptyText}>
                Add your work, school, or other regular destinations to compare commute times
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!canAddMore && !isPremium ? (
          <View style={styles.limitReachedContainer}>
            <View style={styles.limitReachedInfo}>
              <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              <Text style={styles.limitReachedText}>
                Free plan includes 1 destination
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Paywall', { source: 'destinations_limit' })}
            >
              <Ionicons name="star" size={20} color={COLORS.white} />
              <Text style={styles.upgradeButtonText}>Upgrade for Unlimited</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle" size={24} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Destination</Text>
          </TouchableOpacity>
        )}
      </View>

      <AddDestinationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(destination) => {
          addDestination(destination);
          setShowAddModal(false);
        }}
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        placesQueryConfig={placesQueryConfig}
        selectedCity={selectedCity}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  destinationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  destinationTransport: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  removeButton: {
    padding: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.sm,
  },
  addButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  limitReachedContainer: {
    gap: SPACING.md,
  },
  limitReachedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  limitReachedText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.primary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.sm,
  },
  upgradeButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  signInPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  signInIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  signInTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  signInText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    alignItems: 'center',
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
