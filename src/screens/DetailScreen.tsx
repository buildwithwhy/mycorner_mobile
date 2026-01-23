import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { Neighborhood } from '../data/neighborhoods';
import { useApp, type NeighborhoodStatus } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { calculateDistance, estimateCommuteTime } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { COLORS, DESTINATION_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import SignInPromptModal from '../components/SignInPromptModal';
import AffordabilityBadge from '../components/AffordabilityBadge';
import RatingCard from '../components/RatingCard';

export default function DetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const neighborhood = route.params?.neighborhood as Neighborhood;
  const { session } = useAuth();
  const {
    isFavorite,
    toggleFavorite,
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
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(notes[neighborhood?.id] || '');
  const [isEditingRatings, setIsEditingRatings] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInFeature, setSignInFeature] = useState('this feature');

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

  // Get effective ratings (user ratings override defaults)
  const getEffectiveRating = (metric: keyof typeof neighborhood) => {
    return currentUserRatings[metric as keyof typeof currentUserRatings] ?? neighborhood[metric];
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhood.id, result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhood.id, result.assets[0].uri);
    }
  };

  const handleSaveNote = () => {
    setNeighborhoodNote(neighborhood.id, noteText);
    setIsEditingNote(false);
  };

  if (!neighborhood) {
    return (
      <View style={styles.container}>
        <Text>Neighborhood not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{neighborhood.name}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.borough}>{neighborhood.borough}</Text>
            <Text style={styles.description}>{neighborhood.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Affordability</Text>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Cost of Living</Text>
              <View style={styles.affordabilityDisplay}>
                <AffordabilityBadge value={neighborhood.affordability} size="large" />
              </View>
              <Text style={styles.priceNote}>
                {neighborhood.affordability === 5 && 'Very Affordable'}
                {neighborhood.affordability === 4 && 'Affordable'}
                {neighborhood.affordability === 3 && 'Moderate'}
                {neighborhood.affordability === 2 && 'Expensive'}
                {neighborhood.affordability === 1 && 'Very Expensive'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.highlightsContainer}>
              {neighborhood.highlights.map((highlight, index) => (
                <View key={index} style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.noteSectionHeader}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              <TouchableOpacity onPress={() => requireAuth('ratings', () => setIsEditingRatings(!isEditingRatings))}>
                <Ionicons
                  name={isEditingRatings ? 'checkmark-circle' : 'pencil'}
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {[
              { key: 'safety', icon: 'shield-checkmark', label: 'Safety' },
              { key: 'transit', icon: 'bus', label: 'Public Transit' },
              { key: 'greenSpace', icon: 'leaf', label: 'Green Spaces' },
              { key: 'nightlife', icon: 'moon', label: 'Nightlife' },
              { key: 'familyFriendly', icon: 'people', label: 'Family Friendly' },
            ].map((rating) => (
              <RatingCard
                key={rating.key}
                icon={rating.icon as keyof typeof Ionicons.glyphMap}
                label={rating.label}
                value={getEffectiveRating(rating.key as keyof typeof neighborhood) as number}
                isEditing={isEditingRatings}
                isCustom={!!currentUserRatings[rating.key as keyof typeof currentUserRatings]}
                onRatingChange={(value) => setUserRating(neighborhood.id, rating.key, value)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Photos</Text>
            <View style={styles.photosContainer}>
              {currentPhotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {currentPhotos.map((uri, index) => (
                    <View key={index} style={styles.photoWrapper}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removeNeighborhoodPhoto(neighborhood.id, uri)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoActionButton} onPress={() => requireAuth('photos', takePhoto)}>
                  <Ionicons name="camera" size={24} color={COLORS.primary} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionButton} onPress={() => requireAuth('photos', pickImage)}>
                  <Ionicons name="images" size={24} color={COLORS.primary} />
                  <Text style={styles.photoActionText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.noteSectionHeader}>
              <Text style={styles.sectionTitle}>My Notes</Text>
              {!isEditingNote && (
                <TouchableOpacity onPress={() => requireAuth('notes', () => setIsEditingNote(true))}>
                  <Ionicons name="pencil" size={20} color={COLORS.primary} />
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
                    placeholder="Add your notes about this neighborhood..."
                    placeholderTextColor="#9ca3af"
                  />
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={[styles.noteButton, styles.noteCancelButton]}
                      onPress={() => {
                        setNoteText(notes[neighborhood.id] || '');
                        setIsEditingNote(false);
                      }}
                    >
                      <Text style={styles.noteCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.noteButton, styles.noteSaveButton]} onPress={handleSaveNote}>
                      <Text style={styles.noteSaveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {notes[neighborhood.id] ? (
                    <Text style={styles.noteText}>{notes[neighborhood.id]}</Text>
                  ) : (
                    <TouchableOpacity style={styles.addNoteButton} onPress={() => requireAuth('notes', () => setIsEditingNote(true))}>
                      <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.addNoteText}>Add a note</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Facts</Text>
            <View style={styles.factsList}>
              <View style={styles.fact}>
                <Ionicons name="location" size={20} color={COLORS.gray500} />
                <Text style={styles.factText}>Located in {neighborhood.borough}</Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="cash-outline" size={20} color={COLORS.gray500} />
                <Text style={styles.factText}>
                  {neighborhood.affordability >= 4 ? 'Affordable area' : neighborhood.affordability === 3 ? 'Moderately priced' : 'Premium area'}
                </Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.gray500} />
                <Text style={styles.factText}>
                  {neighborhood.safety >= 4 ? 'Very safe area' : 'Safe area'}
                </Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="people" size={20} color={COLORS.gray500} />
                <Text style={styles.factText}>
                  {neighborhood.familyFriendly >= 4 ? 'Very family-friendly' : neighborhood.familyFriendly >= 3 ? 'Family-friendly' : 'Best for adults'}
                </Text>
              </View>
            </View>
          </View>

          {destinations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithButton}>
                <Text style={styles.sectionTitle}>Commute Times</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Destinations')}>
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
                  const time = estimateCommuteTime(distance);

                  return (
                    <View key={destination.id} style={styles.commuteItem}>
                      <View style={[styles.commuteIconCircle, { backgroundColor: DESTINATION_COLORS[index % DESTINATION_COLORS.length] }]}>
                        <Ionicons name="flag" size={16} color="white" />
                      </View>
                      <View style={styles.commuteTextContainer}>
                        <Text style={styles.commuteLabel}>{destination.label}</Text>
                        <Text style={styles.commuteAddress}>{destination.address}</Text>
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isFavorite(neighborhood.id) && styles.actionButtonActive]}
            onPress={() => requireAuth('favorites', () => toggleFavorite(neighborhood.id))}
          >
            <Ionicons
              name={isFavorite(neighborhood.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite(neighborhood.id) ? '#ef4444' : '#6b7280'}
            />
            <Text style={[styles.actionButtonText, isFavorite(neighborhood.id) && styles.actionButtonTextActive]}>
              {isFavorite(neighborhood.id) ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isInComparison(neighborhood.id) && styles.actionButtonActive]}
            onPress={() => {
              if (comparison.length >= 3 && !isInComparison(neighborhood.id)) {
                Alert.alert('Comparison Full', 'You can only compare up to 3 neighborhoods at once.');
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
          onPress={() => requireAuth('status', () => setShowStatusMenu(!showStatusMenu))}
        >
          <Ionicons name="checkbox-outline" size={20} color="white" />
          <Text style={styles.statusButtonText}>
            {currentStatus === 'shortlist' && 'Shortlist'}
            {currentStatus === 'want_to_visit' && 'Want to Visit'}
            {currentStatus === 'visited' && 'Visited'}
            {currentStatus === 'living_here' && 'Living Here'}
            {currentStatus === 'ruled_out' && 'Ruled Out'}
            {!currentStatus && 'Set Status'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>

        {showStatusMenu && (
          <View style={styles.statusMenu}>
            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, 'shortlist');
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.statusOptionText}>Shortlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, 'want_to_visit');
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.statusOptionText}>Want to Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, 'visited');
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.statusOptionText}>Visited</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, 'living_here');
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.statusOptionText}>Living Here</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, 'ruled_out');
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.statusOptionText}>Ruled Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionClear]}
              onPress={() => {
                setNeighborhoodStatus(neighborhood.id, null);
                setShowStatusMenu(false);
              }}
            >
              <Text style={[styles.statusOptionText, styles.statusOptionClearText]}>Clear Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <SignInPromptModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        featureName={signInFeature}
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
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
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
  section: {
    marginBottom: SPACING.xxl,
  },
  borough: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray900,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.lg,
  },
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  priceLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },
  affordabilityDisplay: {
    marginBottom: SPACING.md,
  },
  priceNote: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  highlightsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  highlightText: {
    fontSize: FONT_SIZES.base + 1,
    color: COLORS.gray900,
    marginLeft: SPACING.md,
    flex: 1,
  },
  factsList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  factText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
    marginLeft: SPACING.md,
    flex: 1,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
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
  },
  actionButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
    marginLeft: 6,
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
  },
  statusButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base + 1,
    fontWeight: '600',
    marginHorizontal: SPACING.sm,
  },
  statusMenu: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statusOption: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  statusOptionText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray900,
  },
  statusOptionClear: {
    borderBottomWidth: 0,
  },
  statusOptionClearText: {
    color: COLORS.error,
  },
  photosContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  photosScroll: {
    marginBottom: SPACING.lg,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  photoActionText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  noteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  noteContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  noteInput: {
    fontSize: FONT_SIZES.base + 1,
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
  noteButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  noteCancelButton: {
    backgroundColor: COLORS.gray100,
  },
  noteCancelButtonText: {
    fontSize: FONT_SIZES.base + 1,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  noteSaveButton: {
    backgroundColor: COLORS.primary,
  },
  noteSaveButtonText: {
    fontSize: FONT_SIZES.base + 1,
    fontWeight: '600',
    color: COLORS.white,
  },
  noteText: {
    fontSize: FONT_SIZES.base + 1,
    color: COLORS.gray900,
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
    fontSize: FONT_SIZES.base + 1,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  manageLink: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  commuteList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  commuteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  commuteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  commuteTextContainer: {
    flex: 1,
  },
  commuteLabel: {
    fontSize: FONT_SIZES.base + 1,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
});
