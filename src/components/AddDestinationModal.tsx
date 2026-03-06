import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
import { TransportMode } from '../contexts/AppContext';
import { getTransportModeInfo } from '../utils/commute';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, MODAL_STYLES } from '../constants/theme';
import type { City } from '../data/cities';

const TRANSPORT_MODES: TransportMode[] = ['transit', 'walking', 'cycling', 'driving'];

interface AddDestinationModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (destination: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    transportMode: TransportMode;
  }) => void;
  googleMapsApiKey: string;
  placesQueryConfig: {
    components: string;
    location: string;
    radius: number;
  };
  selectedCity: City;
}

export default function AddDestinationModal({
  visible,
  onClose,
  onAdd,
  googleMapsApiKey,
  placesQueryConfig,
  selectedCity,
}: AddDestinationModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode>('transit');
  const autocompleteRef = useRef<GooglePlacesAutocompleteRef>(null);

  const resetModal = () => {
    setNewLabel('');
    setNewAddress('');
    setSelectedCoords(null);
    setSelectedTransportMode('transit');
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
  };

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

    onAdd({
      label: newLabel,
      address: newAddress,
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      transportMode: selectedTransportMode,
    });

    resetModal();
  };

  const handleCloseModal = () => {
    resetModal();
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={MODAL_STYLES.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[MODAL_STYLES.content, { maxHeight: '90%' }]}
            >
              <View style={MODAL_STYLES.header}>
                <Text style={MODAL_STYLES.title}>New Destination</Text>
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
                {!googleMapsApiKey ? (
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
                        key: googleMapsApiKey,
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
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.warningBg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    marginBottom: SPACING.md,
  },
  apiKeyWarningContent: {
    flex: 1,
  },
  apiKeyWarningTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.warningDark,
    marginBottom: 4,
  },
  apiKeyWarningText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.warningTextDark,
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
