import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useApp, TransportMode, useCity } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getTransportModeInfo } from '../utils/commute';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

const TRANSPORT_MODES: TransportMode[] = ['transit', 'walking', 'cycling', 'driving'];

export default function DestinationsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const { destinations, addDestination, removeDestination } = useApp();
  const { selectedCity } = useCity();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode>('transit');
  const autocompleteRef = useRef<any>(null);

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

  const handleAddDestination = () => {
    Keyboard.dismiss();

    if (!newLabel.trim()) {
      Alert.alert('Missing Information', 'Please enter a label for this destination');
      return;
    }

    if (!newAddress.trim() || !selectedCoords) {
      Alert.alert('Missing Information', 'Please select an address from the suggestions');
      return;
    }

    addDestination({
      label: newLabel,
      address: newAddress,
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      transportMode: selectedTransportMode,
    });

    setNewLabel('');
    setNewAddress('');
    setSelectedCoords(null);
    setSelectedTransportMode('transit');
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
    setShowAddModal(false);
  };

  const handleCloseModal = () => {
    setNewLabel('');
    setNewAddress('');
    setSelectedCoords(null);
    setSelectedTransportMode('transit');
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
    Keyboard.dismiss();
    setShowAddModal(false);
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
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
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={24} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Destination</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Destination</Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={24} color={COLORS.gray500} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.inputLabel}>Label</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., My Office, Partner's Work, School"
                    value={newLabel}
                    onChangeText={setNewLabel}
                    placeholderTextColor={COLORS.gray400}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Address</Text>
                  {GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY' ? (
                      <View style={styles.apiKeyWarning}>
                        <Ionicons name="information-circle" size={24} color={COLORS.warning} />
                        <View style={styles.apiKeyWarningContent}>
                          <Text style={styles.apiKeyWarningTitle}>API Key Required</Text>
                          <Text style={styles.apiKeyWarningText}>
                            To use address autocomplete, add your Google Maps API key in config.ts
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.autocompleteContainer}>
                        <GooglePlacesAutocomplete
                        ref={autocompleteRef}
                        placeholder="Search for an address..."
                        fetchDetails={true}
                        onPress={(data, details = null) => {
                          if (details) {
                            setNewAddress(data.description);
                            setSelectedCoords({
                              latitude: details.geometry.location.lat,
                              longitude: details.geometry.location.lng,
                            });
                          }
                        }}
                        query={{
                          key: GOOGLE_MAPS_API_KEY,
                          language: 'en',
                          ...placesQueryConfig,
                        }}
                        styles={{
                          container: {
                            flex: 0,
                            zIndex: 1,
                          },
                          textInputContainer: {
                            backgroundColor: COLORS.gray50,
                            borderWidth: 1,
                            borderColor: COLORS.gray200,
                            borderRadius: BORDER_RADIUS.sm,
                            paddingHorizontal: 4,
                          },
                          textInput: {
                            height: 44,
                            fontSize: FONT_SIZES.base + 1,
                            color: COLORS.gray900,
                            backgroundColor: COLORS.transparent,
                          },
                          listView: {
                            backgroundColor: COLORS.white,
                            borderRadius: BORDER_RADIUS.sm,
                            marginTop: 4,
                            elevation: 5,
                            shadowColor: COLORS.black,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
                            position: 'absolute',
                            top: 50,
                            width: '100%',
                          },
                          row: {
                            padding: 13,
                            minHeight: 44,
                          },
                          description: {
                            fontSize: FONT_SIZES.base,
                            color: COLORS.gray900,
                          },
                          poweredContainer: {
                            display: 'none',
                          },
                        }}
                        enablePoweredByContainer={false}
                        debounce={300}
                        minLength={2}
                        nearbyPlacesAPI="GooglePlacesSearch"
                        GooglePlacesSearchQuery={{
                          rankby: 'distance',
                        }}
                        listViewDisplayed="auto"
                      />
                      </View>
                    )}

                    {newAddress ? (
                      <View style={styles.selectedAddressContainer}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.selectedAddressText}>{newAddress}</Text>
                      </View>
                    ) : null}

                  <Text style={styles.inputLabel}>How will you get there?</Text>
                  <View style={styles.transportModeContainer}>
                    {TRANSPORT_MODES.map((mode) => {
                      const modeInfo = getTransportModeInfo(mode);
                      const isSelected = selectedTransportMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.transportModeOption,
                            isSelected && styles.transportModeOptionSelected,
                          ]}
                          onPress={() => setSelectedTransportMode(mode)}
                        >
                          <Ionicons
                            name={modeInfo.icon as keyof typeof Ionicons.glyphMap}
                            size={24}
                            color={isSelected ? COLORS.primary : COLORS.gray400}
                          />
                          <Text
                            style={[
                              styles.transportModeLabel,
                              isSelected && styles.transportModeLabelSelected,
                            ]}
                          >
                            {modeInfo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.helperText}>
                    💡 Start typing and select from suggestions for accurate coordinates
                  </Text>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalAddButton,
                      (!newLabel.trim() || !selectedCoords) && styles.modalAddButtonDisabled,
                    ]}
                    onPress={handleAddDestination}
                    disabled={!newLabel.trim() || !selectedCoords}
                  >
                    <Text style={styles.modalAddButtonText}>Add Destination</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  modalBody: {
    maxHeight: 450,
  },
  modalBodyContent: {
    padding: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base + 1,
    color: COLORS.gray900,
    marginBottom: SPACING.lg,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  autocompleteContainer: {
    flex: 1,
    zIndex: 1,
    minHeight: 200,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  helperText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  apiKeyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#fffbeb',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: SPACING.md,
  },
  apiKeyWarningContent: {
    flex: 1,
  },
  apiKeyWarningTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  apiKeyWarningText: {
    fontSize: FONT_SIZES.md,
    color: '#78350f',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  modalAddButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    opacity: 0.5,
  },
  modalAddButtonText: {
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
  transportModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  transportModeOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  transportModeOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  transportModeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  transportModeLabelSelected: {
    color: COLORS.primary,
  },
});
