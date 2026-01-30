import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { Neighborhood } from '../data/neighborhoods';
import { useApp, type NeighborhoodStatus } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { calculateDistance, estimateCommuteTime, getTransportModeInfo } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { getNeighborhoodImage } from '../assets/neighborhood-images';
import { COLORS, DESTINATION_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import SignInPromptModal from '../components/SignInPromptModal';
import StatusPickerModal from '../components/StatusPickerModal';
import AffordabilityBadge from '../components/AffordabilityBadge';
import RatingCard from '../components/RatingCard';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { CRITERIA_INFO } from '../contexts/PreferencesContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

export default function DetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const neighborhood = route.params?.neighborhood as Neighborhood;
  const { session } = useAuth();
  const { comparisonLimit, requiresUpgrade } = useFeatureAccess();
  const {
    status,
    setNeighborhoodStatus,
    isInComparison,
    toggleComparison,
    comparison,
    notes,
    setNeighborhoodNote,
    photos,
    addNeighborhoodPhoto,
    removeNeighborhoodPhoto,
    userRatings,
    setUserRating,
    destinations,
  } = useApp();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(notes[neighborhood?.id] || '');
  const [isEditingRatings, setIsEditingRatings] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInFeature, setSignInFeature] = useState('this feature');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requireAuth = (featureName: string, action: () => void) => {
    if (!session) {
      setSignInFeature(featureName);
      setShowSignInModal(true);
      return;
    }
    action();
  };

  const currentStatus = status[neighborhood?.id] || null;
  const currentPhotos = photos[neighborhood?.id] || [];
  const currentUserRatings = userRatings[neighborhood?.id] || {};

  // Build gallery images: default image first, then user photos
  const defaultImage = getNeighborhoodImage(neighborhood?.id);
  const galleryImages: Array<{ uri?: string; isDefault?: boolean; source?: any }> = [];

  if (defaultImage) {
    galleryImages.push({ isDefault: true, source: defaultImage });
  }
  currentPhotos.forEach((uri) => {
    galleryImages.push({ uri });
  });

  // Get effective ratings (user ratings override defaults)
  const getEffectiveRating = (metric: keyof typeof neighborhood) => {
    return currentUserRatings[metric as keyof typeof currentUserRatings] ?? neighborhood[metric];
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isMountedRef.current) return;

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!isMountedRef.current) return;

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhood.id, result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (!isMountedRef.current) return;

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!isMountedRef.current) return;

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhood.id, result.assets[0].uri);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: 'Take Photo', onPress: () => requireAuth('photos', takePhoto) },
      { text: 'Choose from Library', onPress: () => requireAuth('photos', pickImage) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeletePhoto = (uri: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNeighborhoodPhoto(neighborhood.id, uri) },
    ]);
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

  const renderGalleryItem = ({ item, index }: { item: typeof galleryImages[0]; index: number }) => {
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
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                <AffordabilityBadge value={neighborhood.affordability} size="small" />
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => requireAuth('ratings', () => setIsEditingRatings(!isEditingRatings))}
              >
                <Ionicons
                  name={isEditingRatings ? 'checkmark' : 'pencil'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.editButtonText}>
                  {isEditingRatings ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ratingsGrid}>
              {[
                { key: 'safety', icon: 'shield-checkmark', label: 'Safety', description: CRITERIA_INFO.safety.description },
                { key: 'transit', icon: 'bus', label: 'Transit', description: CRITERIA_INFO.transit.description },
                { key: 'greenSpace', icon: 'leaf', label: 'Green Space', description: CRITERIA_INFO.greenSpace.description },
                { key: 'nightlife', icon: 'moon', label: 'Nightlife', description: CRITERIA_INFO.nightlife.description },
                { key: 'familyFriendly', icon: 'home', label: 'Family', description: CRITERIA_INFO.familyFriendly.description },
                { key: 'dining', icon: 'restaurant', label: 'Dining', description: CRITERIA_INFO.dining.description },
              ].map((rating) => (
                <RatingCard
                  key={rating.key}
                  icon={rating.icon as keyof typeof Ionicons.glyphMap}
                  label={rating.label}
                  description={rating.description}
                  value={getEffectiveRating(rating.key as keyof typeof neighborhood) as number}
                  isEditing={isEditingRatings}
                  isCustom={!!currentUserRatings[rating.key as keyof typeof currentUserRatings]}
                  onRatingChange={(value) => setUserRating(neighborhood.id, rating.key, value)}
                />
              ))}
            </View>

            {/* Local Scene (Vibe) */}
            <View style={styles.localSceneRow}>
              <View style={styles.localSceneLabel}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
                <Text style={styles.localSceneLabelText}>Local Scene</Text>
              </View>
              <View style={[
                styles.localSceneBadge,
                neighborhood.vibe === 'happening' && styles.localSceneBadgeHappening,
                neighborhood.vibe === 'quiet' && styles.localSceneBadgeQuiet,
              ]}>
                <Text style={styles.localSceneBadgeText}>
                  {neighborhood.vibe === 'happening' ? 'Active & Bustling' :
                   neighborhood.vibe === 'quiet' ? 'Quiet & Peaceful' : 'Balanced'}
                </Text>
              </View>
            </View>
          </View>

          {/* Commute Times */}
          {destinations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Commute Times</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Destinations' as never)}>
                  <Text style={styles.manageLink}>Manage</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.commuteList}>
                {destinations.map((destination, index) => {
                  const neighborhoodCoords = getNeighborhoodCoordinates(neighborhood.id);
                  const distance = calculateDistance(
                    neighborhoodCoords.latitude,
                    neighborhoodCoords.longitude,
                    destination.latitude,
                    destination.longitude
                  );
                  const transportMode = destination.transportMode || 'transit';
                  const time = estimateCommuteTime(distance, transportMode);
                  const modeInfo = getTransportModeInfo(transportMode);

                  return (
                    <View key={destination.id} style={styles.commuteItem}>
                      <View
                        style={[
                          styles.commuteIconCircle,
                          { backgroundColor: DESTINATION_COLORS[index % DESTINATION_COLORS.length] },
                        ]}
                      >
                        <Ionicons name={modeInfo.icon as keyof typeof Ionicons.glyphMap} size={16} color="white" />
                      </View>
                      <View style={styles.commuteTextContainer}>
                        <Text style={styles.commuteLabel}>{destination.label}</Text>
                        <Text style={styles.commuteAddress} numberOfLines={1}>
                          {destination.address}
                        </Text>
                      </View>
                      <View style={styles.commuteTimeContainer}>
                        <Text style={styles.commuteTime}>{time}</Text>
                        <Text style={styles.commuteDistance}>{distance.toFixed(1)} km</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* My Notes */}
          <View style={styles.section}>
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
                      { text: 'Upgrade', onPress: () => navigation.navigate('Paywall' as never, { source: 'comparison_limit' } as never) },
                    ]
                  );
                } else {
                  Alert.alert('Comparison Full', `You can compare up to ${comparisonLimit} neighborhoods at once.`);
                }
              } else {
                toggleComparison(neighborhood.id);
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
        </View>

        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => requireAuth('saving places', () => setShowStatusPicker(true))}
        >
          <Ionicons name={currentStatus ? 'bookmark' : 'bookmark-outline'} size={20} color="white" />
          <Text style={styles.statusButtonText}>
            {currentStatus === 'shortlist' && 'Shortlisted'}
            {currentStatus === 'want_to_visit' && 'Want to Visit'}
            {currentStatus === 'visited' && 'Visited'}
            {currentStatus === 'living_here' && 'Living Here'}
            {currentStatus === 'ruled_out' && 'Ruled Out'}
            {!currentStatus && 'Add to My Places'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>
      </View>

      <SignInPromptModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        featureName={signInFeature}
      />

      <StatusPickerModal
        visible={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        currentStatus={currentStatus}
        onSelectStatus={(newStatus) => setNeighborhoodStatus(neighborhood.id, newStatus)}
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
  localSceneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    ...SHADOWS.small,
  },
  localSceneLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  localSceneLabelText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  localSceneBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  localSceneBadgeHappening: {
    backgroundColor: COLORS.warningLight || '#FEF3C7',
  },
  localSceneBadgeQuiet: {
    backgroundColor: COLORS.successLight || '#D1FAE5',
  },
  localSceneBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
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
