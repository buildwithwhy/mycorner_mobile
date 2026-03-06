import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  TextInput,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { Neighborhood } from '../data/neighborhoods';
import { METRIC_SOURCES } from '../data/neighborhoods';
import { useStatusComparison, useNotesRatings, useDestinations, useCity, type NeighborhoodStatus } from '../contexts/AppContext';
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
import { PremiumBadge } from '../components/FeatureGate';
import { METRICS } from '../config/metrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

export default function DetailScreen() {
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);
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
    const images: Array<{ uri?: string; isDefault?: boolean; source?: ImageSourcePropType }> = [];

    if (defaultImage) {
      images.push({ isDefault: true, source: defaultImage });
    }
    currentPhotos.forEach((uri) => {
      images.push({ uri });
    });

    return images;
  }, [neighborhood?.id, currentPhotos]);

  // Get effective ratings (user ratings override defaults)
  const getEffectiveRating = (metric: string) => {
    if (metric === 'vibe') {
      return currentUserRatings.vibe ?? vibeToScore(neighborhood.vibe);
    }
    return currentUserRatings[metric as keyof typeof currentUserRatings] ?? neighborhood[metric as keyof typeof neighborhood];
  };

  const handleSaveNote = () => {
    setNeighborhoodNote(neighborhood.id, noteText);
    setIsEditingNote(false);
  };

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

  // Optimized getItemLayout for gallery FlatList
  const getGalleryItemLayout = useCallback((_: unknown, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  const renderGalleryItem = useCallback(({ item, index }: { item: typeof galleryImages[0]; index: number }) => {
    const isUserPhoto = !item.isDefault && item.uri;

    return (
      <View style={styles.gallerySlide}>
        {item.isDefault ? (
          <Image source={item.source} style={styles.heroImage} />
        ) : (
          <Image source={{ uri: item.uri }} style={styles.heroImage} />
        )}

        {/* Delete button for user photos */}
        {isUserPhoto && (
          <TouchableOpacity
            style={styles.deletePhotoButton}
            onPress={() => handleDeletePhoto(item.uri!)}
          >
            <Ionicons name="trash" size={18} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* Photo type indicator */}
        <View style={styles.photoTypeIndicator}>
          <Ionicons
            name={item.isDefault ? 'image' : 'camera'}
            size={14}
            color={COLORS.white}
          />
          <Text style={styles.photoTypeText}>
            {item.isDefault ? 'Neighborhood' : 'My Photo'}
          </Text>
        </View>
      </View>
    );
  }, [handleDeletePhoto]);

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Gallery */}
        <View style={styles.heroContainer}>
          {galleryImages.length > 0 ? (
            <>
              <FlatList
                ref={galleryRef}
                data={galleryImages}
                renderItem={renderGalleryItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setActiveImageIndex(index);
                }}
                keyExtractor={(_, index) => index.toString()}
                getItemLayout={getGalleryItemLayout}
                initialNumToRender={2}
              />

              {/* Gallery pagination dots */}
              {galleryImages.length > 1 && (
                <View style={styles.paginationDots}>
                  {galleryImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === activeImageIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.heroInitial}>{neighborhood.name[0]}</Text>
              <Text style={styles.heroPlaceholderText}>{neighborhood.borough}</Text>
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* Add photo button */}
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
            <Ionicons name="camera-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>

          {/* Photo count badge */}
          {currentPhotos.length > 0 && (
            <View style={styles.photoCountBadge}>
              <Ionicons name="images" size={14} color={COLORS.white} />
              <Text style={styles.photoCountText}>{currentPhotos.length}</Text>
            </View>
          )}
        </View>

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

          {/* Match Score Section - Premium Only */}
          {hasCustomPreferences && canAccess('personalized_scores') && (
            <View style={styles.matchScoreSection}>
              <View style={styles.matchScoreHeader}>
                <View style={styles.matchScoreBadge}>
                  <Ionicons name="sparkles" size={18} color={COLORS.white} />
                  <Text style={styles.matchScoreValue}>
                    {calculateMatchPercentage(neighborhood, preferences)}%
                  </Text>
                </View>
                <View style={styles.matchScoreTextContainer}>
                  <View style={styles.matchScoreTitleRow}>
                    <Text style={styles.matchScoreTitle}>Your Match</Text>
                    <PremiumBadge />
                  </View>
                  <Text style={styles.matchScoreSubtitle}>Based on your preferences</Text>
                </View>
              </View>
              {getMatchReasons(neighborhood, preferences).length > 0 && (
                <View style={styles.matchReasons}>
                  <Text style={styles.matchReasonsTitle}>Why it matches:</Text>
                  {getMatchReasons(neighborhood, preferences).map((reason, index) => (
                    <View key={reason.criterion} style={styles.matchReasonItem}>
                      <Ionicons
                        name={reason.isStrength ? 'checkmark-circle' : 'ellipse'}
                        size={16}
                        color={reason.isStrength ? COLORS.success : COLORS.primary}
                      />
                      <Text style={styles.matchReasonText}>
                        {reason.isStrength ? 'Strong' : 'Good'} {reason.label.toLowerCase()}
                        {reason.userWeight >= 70 && ' (high priority)'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Upgrade Prompt for Match Score - Non-Premium with Preferences */}
          {hasCustomPreferences && !canAccess('personalized_scores') && (
            <TouchableOpacity
              style={styles.matchScoreUpgradePrompt}
              onPress={() => navigation.navigate('Paywall', { source: 'detail_match_score' })}
            >
              <View style={styles.matchScoreUpgradeIcon}>
                <Ionicons name="sparkles" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.matchScoreUpgradeText}>
                <Text style={styles.matchScoreUpgradeTitle}>See Your Match Score</Text>
                <Text style={styles.matchScoreUpgradeSubtitle}>
                  Unlock personalized insights for this neighborhood
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}

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
          {commuteItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Commute Times</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Destinations')}>
                  <Text style={styles.manageLink}>Manage</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.commuteList}>
                {commuteItems.map((item) => (
                  <View key={item.destinationId} style={styles.commuteItem}>
                    <View
                      style={[
                        styles.commuteIconCircle,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <Ionicons name={item.modeIcon as keyof typeof Ionicons.glyphMap} size={16} color="white" />
                    </View>
                    <View style={styles.commuteTextContainer}>
                      <Text style={styles.commuteLabel}>{item.label}</Text>
                      <Text style={styles.commuteAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                    <View style={styles.commuteTimeContainer}>
                      <Text style={styles.commuteTime}>{item.time}</Text>
                      <Text style={styles.commuteDistance}>{item.distance.toFixed(1)} km</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* My Notes */}
          <View style={styles.section} onLayout={(e) => { notesSectionY.current = e.nativeEvent.layout.y; }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Notes</Text>
              {!isEditingNote && notes[neighborhood.id] && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => requireAuth('notes', () => setIsEditingNote(true))}
                >
                  <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.noteContainer}>
              {isEditingNote ? (
                <>
                  <TextInput
                    style={styles.noteInput}
                    multiline
                    numberOfLines={4}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="What do you think about this neighborhood?"
                    placeholderTextColor={COLORS.gray400}
                  />
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={styles.noteCancelButton}
                      onPress={() => {
                        setNoteText(notes[neighborhood.id] || '');
                        setIsEditingNote(false);
                      }}
                    >
                      <Text style={styles.noteCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.noteSaveButton} onPress={handleSaveNote}>
                      <Text style={styles.noteSaveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : notes[neighborhood.id] ? (
                <Text style={styles.noteText}>{notes[neighborhood.id]}</Text>
              ) : (
                <TouchableOpacity
                  style={styles.addNoteButton}
                  onPress={() => requireAuth('notes', () => setIsEditingNote(true))}
                >
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.addNoteText}>Add your thoughts about this area</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom spacing for footer */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, currentStatus && styles.actionButtonActive]}
            onPress={() => requireAuth('saving places', () => setShowStatusPicker(true))}
          >
            <Ionicons
              name={currentStatus ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={currentStatus ? COLORS.primary : COLORS.gray500}
            />
            <Text style={[styles.actionButtonText, currentStatus && styles.actionButtonTextActive]}>
              {currentStatus ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isInComparison(neighborhood.id) && styles.actionButtonActive]}
            onPress={() => {
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
            }}
          >
            <Ionicons
              name={isInComparison(neighborhood.id) ? 'git-compare' : 'git-compare-outline'}
              size={20}
              color={isInComparison(neighborhood.id) ? COLORS.primary : COLORS.gray500}
            />
            <Text style={[styles.actionButtonText, isInComparison(neighborhood.id) && styles.actionButtonTextActive]}>
              {isInComparison(neighborhood.id) ? 'Comparing' : 'Compare'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareNeighborhood(neighborhood, selectedCity.currencySymbol)}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={COLORS.gray500}
            />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => requireAuth('saving places', () => setShowStatusPicker(true))}
        >
          <Ionicons name={currentStatus ? 'bookmark' : 'bookmark-outline'} size={20} color="white" />
          <Text style={styles.statusButtonText}>
            {currentStatus ? STATUS_CONFIG[currentStatus].label : 'Add to My Places'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>
      </View>

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

  // Hero Gallery
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: COLORS.gray200,
  },
  gallerySlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: {
    fontSize: 72,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  heroPlaceholderText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 50,
    right: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  photoCountText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  photoTypeIndicator: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  photoTypeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.white,
  },
  paginationDots: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
    width: 20,
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

  // Match Score Section
  matchScoreSection: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  matchScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  matchScoreValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  matchScoreTextContainer: {
    flex: 1,
  },
  matchScoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  matchScoreTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  matchScoreSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  matchReasons: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
  },
  matchReasonsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
  },
  matchReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  matchReasonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
  },
  matchScoreUpgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.small,
  },
  matchScoreUpgradeIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  matchScoreUpgradeText: {
    flex: 1,
  },
  matchScoreUpgradeTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  matchScoreUpgradeSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  manageLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
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
  // Commute
  commuteList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  commuteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  commuteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  commuteTextContainer: {
    flex: 1,
  },
  commuteLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  commuteAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  commuteTimeContainer: {
    alignItems: 'flex-end',
  },
  commuteTime: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  commuteDistance: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },

  // Notes
  noteContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  noteInput: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  noteActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  noteCancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  noteCancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  noteSaveButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  noteSaveButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  noteText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray700,
    lineHeight: 22,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  addNoteText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    ...SHADOWS.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  actionButtonTextActive: {
    color: COLORS.primary,
  },
  statusButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.sm,
  },
  statusButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
