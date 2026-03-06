import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { METRIC_SOURCES } from '../data/neighborhoods';
import { useStatusComparison, useNotesRatings, useDestinations, useCity } from '../contexts/AppContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useCommuteData } from '../hooks/useCommuteData';
import { getNeighborhoodImage } from '../assets/neighborhood-images';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS, STATUS_CONFIG } from '../constants/theme';
import SignInPromptModal from '../components/SignInPromptModal';
import StatusPickerModal from '../components/StatusPickerModal';
import AffordabilityBadge from '../components/AffordabilityBadge';
import RatingCard from '../components/RatingCard';
import { useToast } from '../contexts/ToastContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { usePreferences } from '../contexts/PreferencesContext';
import { shareNeighborhood } from '../utils/sharing';
import { calculateMatchPercentage, getMatchReasons, vibeToScore } from '../utils/personalizedScoring';
import { METRICS } from '../config/metrics';
import { DetailHeroGallery } from '../components/detail/DetailHeroGallery';
import { DetailMatchSection } from '../components/detail/DetailMatchSection';
import { DetailCommuteSection } from '../components/detail/DetailCommuteSection';
import { DetailNotesSection } from '../components/detail/DetailNotesSection';
import { DetailFooterActions } from '../components/detail/DetailFooterActions';
import type { GalleryImage } from '../components/detail/DetailHeroGallery';

const HERO_HEIGHT = 280;

export default function DetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const route = useRoute<RouteProp<RootStackParamList, 'Detail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const neighborhood = route.params.neighborhood;
  const { requireAuth, showSignInModal, signInFeatureName, dismissSignInModal } = useRequireAuth();
  const { showToast } = useToast();
  const { comparisonLimit, requiresUpgrade, canAccess } = useFeatureAccess();
  const { preferences, hasCustomPreferences } = usePreferences();
  const { status, setNeighborhoodStatus, isInComparison, toggleComparison, comparison } = useStatusComparison();
  const { notes, setNeighborhoodNote, photos, addNeighborhoodPhoto, removeNeighborhoodPhoto, userRatings, setUserRating } = useNotesRatings();
  const { cityDestinations: destinations } = useDestinations();
  const { selectedCity } = useCity();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(notes[neighborhood?.id] || '');
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const notesSectionY = useRef(0);

  // Photo management hook (handles permissions, picking, taking, deleting)
  const { handleAddPhoto, handleDeletePhoto } = usePhotoManagement(
    neighborhood?.id,
    addNeighborhoodPhoto,
    removeNeighborhoodPhoto,
    requireAuth,
  );

  // Commute data hook (calculates distances and travel times)
  const commuteItems = useCommuteData(neighborhood?.id, destinations);

  const currentStatus = status[neighborhood?.id] || null;
  const currentPhotos = useMemo(() => photos[neighborhood?.id] || [], [photos, neighborhood?.id]);
  const currentUserRatings = useMemo(() => userRatings[neighborhood?.id] || {}, [userRatings, neighborhood?.id]);

  // Build gallery images: default image first, then user photos (memoized)
  const galleryImages = useMemo(() => {
    const defaultImage = getNeighborhoodImage(neighborhood?.id);
    const images: GalleryImage[] = [];

    if (defaultImage) {
      images.push({ isDefault: true, source: defaultImage });
    }
    currentPhotos.forEach((uri) => {
      images.push({ uri });
    });

    return images;
  }, [neighborhood?.id, currentPhotos]);

  // Memoize match scoring to avoid recalculating on every render
  const matchPercentage = useMemo(
    () => calculateMatchPercentage(neighborhood, preferences),
    [neighborhood, preferences]
  );
  const matchReasons = useMemo(
    () => getMatchReasons(neighborhood, preferences),
    [neighborhood, preferences]
  );

  // Get effective ratings (user ratings override defaults)
  const getEffectiveRating = useCallback((metric: string) => {
    if (metric === 'vibe') {
      return currentUserRatings.vibe ?? vibeToScore(neighborhood.vibe);
    }
    return currentUserRatings[metric as keyof typeof currentUserRatings] ?? neighborhood[metric as keyof typeof neighborhood];
  }, [currentUserRatings, neighborhood]);

  const handleSaveNote = useCallback(() => {
    setNeighborhoodNote(neighborhood.id, noteText);
    setIsEditingNote(false);
  }, [neighborhood.id, noteText, setNeighborhoodNote]);

  const handleCancelEdit = useCallback(() => {
    setNoteText(notes[neighborhood.id] || '');
    setIsEditingNote(false);
  }, [notes, neighborhood.id]);

  const handleStartEditNote = useCallback(() => {
    requireAuth('notes', () => setIsEditingNote(true));
  }, [requireAuth]);

  const handleNoteLayout = useCallback((e: { nativeEvent: { layout: { y: number } } }) => {
    notesSectionY.current = e.nativeEvent.layout.y;
  }, []);

  const getAffordabilityLabel = (value: number) => {
    if (value === 5) return 'Very Affordable';
    if (value === 4) return 'Affordable';
    if (value === 3) return 'Moderate';
    if (value === 2) return 'Expensive';
    return 'Very Expensive';
  };

  if (!neighborhood) {
    return (
      <View style={styles.container}>
        <Text>Neighborhood not found</Text>
      </View>
    );
  }

  const handleGoBack = () => navigation.goBack();

  const handleManageDestinations = () => navigation.navigate('Destinations');

  const handleNavigatePaywall = () => navigation.navigate('Paywall', { source: 'detail_match_score' });

  const handleSavePress = () => requireAuth('saving places', () => setShowStatusPicker(true));

  const handleComparePress = () => {
    if (comparison.length >= comparisonLimit && !isInComparison(neighborhood.id)) {
      if (requiresUpgrade('unlimited_comparisons')) {
        Alert.alert(
          'Comparison Limit Reached',
          `You can compare up to ${comparisonLimit} neighborhoods on your current plan. Upgrade to Premium for more!`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Paywall', { source: 'comparison_limit' }) },
          ]
        );
      } else {
        Alert.alert('Comparison Full', `You can compare up to ${comparisonLimit} neighborhoods at once.`);
      }
    } else {
      const wasInComparison = isInComparison(neighborhood.id);
      toggleComparison(neighborhood.id);
      showToast(
        wasInComparison ? 'Removed from Compare' : 'Added to Compare',
        wasInComparison ? 'git-compare-outline' : 'git-compare',
      );
    }
  };

  const handleSharePress = () => shareNeighborhood(neighborhood, selectedCity.currencySymbol);

  const handleStatusPress = () => requireAuth('saving places', () => setShowStatusPicker(true));

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Gallery */}
        <DetailHeroGallery
          galleryImages={galleryImages}
          currentPhotosCount={currentPhotos.length}
          neighborhoodName={neighborhood.name}
          borough={neighborhood.borough}
          screenWidth={screenWidth}
          onGoBack={handleGoBack}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
        />

        <View style={styles.content}>
          {/* Header Info */}
          <View style={styles.headerInfo}>
            <Text style={styles.neighborhoodName}>{neighborhood.name}</Text>
            <Text style={styles.borough}>{neighborhood.borough}</Text>

            {/* Quick Stats Row */}
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <AffordabilityBadge value={neighborhood.affordability} size="small" currencySymbol={selectedCity.currencySymbol} />
                <Text style={styles.quickStatLabel}>{getAffordabilityLabel(neighborhood.affordability)}</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.quickStatValue}>{neighborhood.safety}/5</Text>
                <Text style={styles.quickStatLabel}>Safety</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Ionicons name="bus" size={16} color={COLORS.primary} />
                <Text style={styles.quickStatValue}>{neighborhood.transit}/5</Text>
                <Text style={styles.quickStatLabel}>Transit</Text>
              </View>
            </View>
          </View>

          {/* Match Score Section */}
          <DetailMatchSection
            matchPercentage={matchPercentage}
            matchReasons={matchReasons}
            canAccessScores={canAccess('personalized_scores')}
            hasCustomPreferences={hasCustomPreferences}
            onNavigatePaywall={handleNavigatePaywall}
          />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.description}>{neighborhood.description}</Text>
          </View>

          {/* Highlights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.highlightsContainer}>
              {neighborhood.highlights.map((highlight, index) => (
                <View key={index} style={styles.highlightChip}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Ratings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Ratings</Text>

            <View style={styles.ratingsGrid}>
              {METRICS.map((metric) => (
                <RatingCard
                  key={metric.key}
                  icon={metric.icon}
                  label={metric.label}
                  description={metric.description}
                  value={getEffectiveRating(metric.key) as number}
                  isEditing={editingMetric === metric.key}
                  isCustom={!!currentUserRatings[metric.key as keyof typeof currentUserRatings]}
                  onRatingChange={(value) => setUserRating(neighborhood.id, metric.key, value)}
                  sourceShort={METRIC_SOURCES[neighborhood.cityId]?.[metric.key]?.short}
                  sourceLong={METRIC_SOURCES[neighborhood.cityId]?.[metric.key]?.long}
                  onPress={() => {
                    if (editingMetric === metric.key) {
                      setEditingMetric(null);
                    } else {
                      requireAuth('ratings', () => setEditingMetric(metric.key));
                    }
                  }}
                  onNotePress={() => {
                    setEditingMetric(null);
                    scrollViewRef.current?.scrollTo({ y: HERO_HEIGHT + notesSectionY.current, animated: true });
                    setTimeout(() => {
                      requireAuth('notes', () => setIsEditingNote(true));
                    }, 400);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Commute Times */}
          <DetailCommuteSection
            commuteItems={commuteItems}
            onManageDestinations={handleManageDestinations}
          />

          {/* My Notes */}
          <DetailNotesSection
            isEditingNote={isEditingNote}
            noteText={noteText}
            savedNote={notes[neighborhood.id]}
            onChangeNoteText={setNoteText}
            onSaveNote={handleSaveNote}
            onCancelEdit={handleCancelEdit}
            onStartEdit={handleStartEditNote}
            onLayout={handleNoteLayout}
          />

          {/* Bottom spacing for footer */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <DetailFooterActions
        currentStatus={currentStatus}
        isInComparison={isInComparison(neighborhood.id)}
        onSavePress={handleSavePress}
        onComparePress={handleComparePress}
        onSharePress={handleSharePress}
        onStatusPress={handleStatusPress}
      />

      <SignInPromptModal
        visible={showSignInModal}
        onClose={dismissSignInModal}
        featureName={signInFeatureName}
      />

      <StatusPickerModal
        visible={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        currentStatus={currentStatus}
        onSelectStatus={(newStatus) => {
          setNeighborhoodStatus(neighborhood.id, newStatus);
          if (newStatus) {
            showToast(`Saved to ${STATUS_CONFIG[newStatus].label}`, 'bookmark');
          } else {
            showToast('Removed from My Places', 'bookmark-outline');
          }
        }}
        neighborhoodName={neighborhood.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },

  // Content
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },

  // Header Info
  headerInfo: {
    marginBottom: SPACING.xl,
  },
  neighborhoodName: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  borough: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray500,
    marginBottom: SPACING.lg,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  quickStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gray200,
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  description: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray700,
    lineHeight: 26,
  },

  // Highlights
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  highlightText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray700,
    fontWeight: '500',
  },

  // Ratings
  ratingsGrid: {
    gap: SPACING.sm,
  },
});
