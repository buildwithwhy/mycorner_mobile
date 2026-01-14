import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { Neighborhood } from '../data/neighborhoods';
import { useApp, type NeighborhoodStatus } from '../contexts/AppContext';
import { calculateDistance, estimateCommuteTime } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';

export default function DetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const neighborhood = route.params?.neighborhood as Neighborhood;
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
                {[...Array(5)].map((_, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.affordabilitySymbolLarge,
                      i < (6 - neighborhood.affordability) && styles.affordabilitySymbolLargeActive,
                    ]}
                  >
                    £
                  </Text>
                ))}
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
                  <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.noteSectionHeader}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              <TouchableOpacity onPress={() => setIsEditingRatings(!isEditingRatings)}>
                <Ionicons
                  name={isEditingRatings ? 'checkmark-circle' : 'pencil'}
                  size={20}
                  color="#6366f1"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#6366f1" />
                <Text style={styles.ratingLabel}>Safety</Text>
              </View>
              {isEditingRatings ? (
                <View style={styles.editRatingContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.ratingButton,
                        getEffectiveRating('safety') === value && styles.ratingButtonActive,
                      ]}
                      onPress={() => setUserRating(neighborhood.id, 'safety', value)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          getEffectiveRating('safety') === value && styles.ratingButtonTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < getEffectiveRating('safety') ? 'star' : 'star-outline'}
                        size={20}
                        color="#6366f1"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScore}>
                    {getEffectiveRating('safety')}/5
                    {currentUserRatings.safety && (
                      <Text style={styles.customBadge}> (Custom)</Text>
                    )}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="bus" size={24} color="#6366f1" />
                <Text style={styles.ratingLabel}>Public Transit</Text>
              </View>
              {isEditingRatings ? (
                <View style={styles.editRatingContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.ratingButton,
                        getEffectiveRating('transit') === value && styles.ratingButtonActive,
                      ]}
                      onPress={() => setUserRating(neighborhood.id, 'transit', value)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          getEffectiveRating('transit') === value && styles.ratingButtonTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < getEffectiveRating('transit') ? 'star' : 'star-outline'}
                        size={20}
                        color="#6366f1"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScore}>
                    {getEffectiveRating('transit')}/5
                    {currentUserRatings.transit && (
                      <Text style={styles.customBadge}> (Custom)</Text>
                    )}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="leaf" size={24} color="#6366f1" />
                <Text style={styles.ratingLabel}>Green Spaces</Text>
              </View>
              {isEditingRatings ? (
                <View style={styles.editRatingContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.ratingButton,
                        getEffectiveRating('greenSpace') === value && styles.ratingButtonActive,
                      ]}
                      onPress={() => setUserRating(neighborhood.id, 'greenSpace', value)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          getEffectiveRating('greenSpace') === value && styles.ratingButtonTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < getEffectiveRating('greenSpace') ? 'star' : 'star-outline'}
                        size={20}
                        color="#6366f1"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScore}>
                    {getEffectiveRating('greenSpace')}/5
                    {currentUserRatings.greenSpace && (
                      <Text style={styles.customBadge}> (Custom)</Text>
                    )}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="moon" size={24} color="#6366f1" />
                <Text style={styles.ratingLabel}>Nightlife</Text>
              </View>
              {isEditingRatings ? (
                <View style={styles.editRatingContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.ratingButton,
                        getEffectiveRating('nightlife') === value && styles.ratingButtonActive,
                      ]}
                      onPress={() => setUserRating(neighborhood.id, 'nightlife', value)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          getEffectiveRating('nightlife') === value && styles.ratingButtonTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < getEffectiveRating('nightlife') ? 'star' : 'star-outline'}
                        size={20}
                        color="#6366f1"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScore}>
                    {getEffectiveRating('nightlife')}/5
                    {currentUserRatings.nightlife && (
                      <Text style={styles.customBadge}> (Custom)</Text>
                    )}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="people" size={24} color="#6366f1" />
                <Text style={styles.ratingLabel}>Family Friendly</Text>
              </View>
              {isEditingRatings ? (
                <View style={styles.editRatingContainer}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.ratingButton,
                        getEffectiveRating('familyFriendly') === value && styles.ratingButtonActive,
                      ]}
                      onPress={() => setUserRating(neighborhood.id, 'familyFriendly', value)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          getEffectiveRating('familyFriendly') === value && styles.ratingButtonTextActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < getEffectiveRating('familyFriendly') ? 'star' : 'star-outline'}
                        size={20}
                        color="#6366f1"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScore}>
                    {getEffectiveRating('familyFriendly')}/5
                    {currentUserRatings.familyFriendly && (
                      <Text style={styles.customBadge}> (Custom)</Text>
                    )}
                  </Text>
                </>
              )}
            </View>
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
                <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#6366f1" />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#6366f1" />
                  <Text style={styles.photoActionText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.noteSectionHeader}>
              <Text style={styles.sectionTitle}>My Notes</Text>
              {!isEditingNote && (
                <TouchableOpacity onPress={() => setIsEditingNote(true)}>
                  <Ionicons name="pencil" size={20} color="#6366f1" />
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
                    <TouchableOpacity style={styles.addNoteButton} onPress={() => setIsEditingNote(true)}>
                      <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
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
                <Ionicons name="location" size={20} color="#6b7280" />
                <Text style={styles.factText}>Located in {neighborhood.borough}</Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="cash-outline" size={20} color="#6b7280" />
                <Text style={styles.factText}>
                  {neighborhood.affordability >= 4 ? 'Affordable area' : neighborhood.affordability === 3 ? 'Moderately priced' : 'Premium area'}
                </Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
                <Text style={styles.factText}>
                  {neighborhood.safety >= 4 ? 'Very safe area' : 'Safe area'}
                </Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="people" size={20} color="#6b7280" />
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
                  const DESTINATION_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

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
            onPress={() => toggleFavorite(neighborhood.id)}
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
              color={isInComparison(neighborhood.id) ? '#6366f1' : '#6b7280'}
            />
            <Text style={[styles.actionButtonText, isInComparison(neighborhood.id) && styles.actionButtonTextActive]}>
              {isInComparison(neighborhood.id) ? 'Comparing' : 'Compare'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => setShowStatusMenu(!showStatusMenu)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  borough: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  priceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  affordabilityDisplay: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  affordabilitySymbolLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d1d5db',
  },
  affordabilitySymbolLargeActive: {
    color: '#6366f1',
  },
  priceNote: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  highlightsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  highlightText: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  ratingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  customBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  editRatingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  ratingButtonTextActive: {
    color: '#6366f1',
  },
  factsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  factText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  actionButtonActive: {
    backgroundColor: '#eef2ff',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  actionButtonTextActive: {
    color: '#6366f1',
  },
  statusButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  statusMenu: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statusOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  statusOptionClear: {
    borderBottomWidth: 0,
  },
  statusOptionClearText: {
    color: '#ef4444',
  },
  photosContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photosScroll: {
    marginBottom: 16,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  noteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  noteContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteInput: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  noteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noteCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  noteCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  noteSaveButton: {
    backgroundColor: '#6366f1',
  },
  noteSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  noteText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addNoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  manageLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  commuteList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commuteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  commuteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commuteTextContainer: {
    flex: 1,
  },
  commuteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  commuteAddress: {
    fontSize: 12,
    color: '#6b7280',
  },
  commuteTimeContainer: {
    alignItems: 'flex-end',
  },
  commuteTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 2,
  },
  commuteDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
});
