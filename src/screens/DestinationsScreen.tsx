import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useApp } from '../contexts/AppContext';
import { GOOGLE_MAPS_API_KEY } from '../../config';

export default function DestinationsScreen() {
  const navigation = useNavigation();
  const { destinations, addDestination, removeDestination } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const autocompleteRef = useRef<any>(null);

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
    });

    setNewLabel('');
    setNewAddress('');
    setSelectedCoords(null);
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
    setShowAddModal(false);
  };

  const handleCloseModal = () => {
    setNewLabel('');
    setNewAddress('');
    setSelectedCoords(null);
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
    Keyboard.dismiss();
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>My Destinations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.description}>
            Add places you visit regularly (work, school, etc.) to see commute information from each neighborhood
          </Text>

          {destinations.length > 0 ? (
            <>
              {destinations.map((destination) => (
                <View key={destination.id} style={styles.destinationCard}>
                  <View style={styles.destinationIcon}>
                    <Ionicons name="location" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.destinationInfo}>
                    <Text style={styles.destinationLabel}>{destination.label}</Text>
                    <Text style={styles.destinationAddress}>{destination.address}</Text>
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
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color="#d1d5db" />
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
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Destination</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>New Destination</Text>
                    <TouchableOpacity onPress={handleCloseModal}>
                      <Ionicons name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    <Text style={styles.inputLabel}>Label</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., My Office, Partner's Work, School"
                      value={newLabel}
                      onChangeText={setNewLabel}
                      placeholderTextColor="#9ca3af"
                      returnKeyType="next"
                    />

                    <Text style={styles.inputLabel}>Address</Text>
                    {GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY' ? (
                      <View style={styles.apiKeyWarning}>
                        <Ionicons name="information-circle" size={24} color="#f59e0b" />
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
                          components: 'country:gb', // Restrict to UK
                          location: '51.5074,-0.1278', // London center
                          radius: 30000, // 30km radius around London
                        }}
                        styles={{
                          container: {
                            flex: 0,
                          },
                          textInputContainer: {
                            backgroundColor: '#f9fafb',
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            paddingHorizontal: 4,
                          },
                          textInput: {
                            height: 44,
                            fontSize: 15,
                            color: '#111827',
                            backgroundColor: 'transparent',
                          },
                          listView: {
                            backgroundColor: 'white',
                            borderRadius: 8,
                            marginTop: 4,
                            elevation: 3,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                          },
                          row: {
                            padding: 13,
                            minHeight: 44,
                          },
                          description: {
                            fontSize: 14,
                            color: '#111827',
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
                      />
                      </View>
                    )}

                    {newAddress ? (
                      <View style={styles.selectedAddressContainer}>
                        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                        <Text style={styles.selectedAddressText}>{newAddress}</Text>
                      </View>
                    ) : null}

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
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
  title: {
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
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  destinationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
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
    gap: 8,
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  apiKeyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 12,
  },
  apiKeyWarningContent: {
    flex: 1,
  },
  apiKeyWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  apiKeyWarningText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalAddButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    opacity: 0.5,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
