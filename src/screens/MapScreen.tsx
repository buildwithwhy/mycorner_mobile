import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useStatusComparison, useDestinations, useCity } from '../contexts/AppContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { calculateDistance, estimateCommuteTime, getTransportModeInfo } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, DESTINATION_COLORS, STATUS_CONFIG, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import NeighborhoodStats from '../components/NeighborhoodStats';
import SignInPromptModal from '../components/SignInPromptModal';
import StatusPickerModal from '../components/StatusPickerModal';

// Memoized marker component — only re-renders when its own props change
const MapMarker = React.memo(function MapMarker({
  neighborhood,
  coords,
  isSelected,
  statusInfo,
  onPress,
}: {
  neighborhood: { id: string; name: string; borough: string };
  coords: { latitude: number; longitude: number };
  isSelected: boolean;
  statusInfo: { color: string; icon: keyof typeof Ionicons.glyphMap } | null;
  onPress: () => void;
}) {
  return (
    <Marker
      coordinate={coords}
      title={neighborhood.name}
      description={neighborhood.borough}
      onPress={onPress}
    >
      <View style={[
        styles.marker,
        isSelected && styles.markerSelected,
        statusInfo && { borderWidth: 3, borderColor: statusInfo.color },
      ]}>
        {statusInfo ? (
          <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
        ) : (
          <Ionicons name="location" size={24} color={isSelected ? COLORS.primary : COLORS.gray500} />
        )}
      </View>
    </Marker>
  );
});

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { requireAuth, showSignInModal, dismissSignInModal } = useRequireAuth();
  const { status, setNeighborhoodStatus, comparison, toggleComparison } = useStatusComparison();
  const { cityDestinations: destinations } = useDestinations();
  const { selectedCity, cityNeighborhoods } = useCity();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const mapRef = useRef<MapView>(null);

  // Request location permission and get initial location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Animate to new city region when city changes
  useEffect(() => {
    if (mapRef.current && selectedCity) {
      mapRef.current.animateToRegion(selectedCity.region, 500);
      setSelectedNeighborhood(null); // Clear selection when switching cities
    }
  }, [selectedCity.id]);

  // Memoize neighborhood coordinates to avoid recalculating on every render
  const neighborhoodCoords = useMemo(() => {
    const coords: Record<string, { latitude: number; longitude: number }> = {};
    cityNeighborhoods.forEach((n) => {
      coords[n.id] = getNeighborhoodCoordinates(n.id);
    });
    return coords;
  }, [cityNeighborhoods]);

  // Memoize the selected neighborhood object
  const selectedNeighborhoodData = useMemo(
    () => selectedNeighborhood ? cityNeighborhoods.find((n) => n.id === selectedNeighborhood) : null,
    [selectedNeighborhood, cityNeighborhoods]
  );

  // Memoize commute calculations for selected neighborhood
  const commuteData = useMemo(() => {
    if (!selectedNeighborhoodData) return [];
    const coords = neighborhoodCoords[selectedNeighborhoodData.id];
    if (!coords) return [];

    return destinations.map((destination, index) => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        destination.latitude,
        destination.longitude
      );
      const transportMode = destination.transportMode || 'transit';
      const time = estimateCommuteTime(distance, transportMode);
      const modeInfo = getTransportModeInfo(transportMode);

      return {
        destination,
        distance,
        time,
        modeInfo,
        color: DESTINATION_COLORS[index % DESTINATION_COLORS.length],
      };
    });
  }, [selectedNeighborhoodData, neighborhoodCoords, destinations]);

  // Center map on user's location
  const centerOnUserLocation = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationPermission(true);
    }

    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  const currentStatus = selectedNeighborhood ? status[selectedNeighborhood] || null : null;

  const getStatusInfo = useCallback((neighborhoodId: string) => {
    const s = status[neighborhoodId];
    return s ? STATUS_CONFIG[s] : null;
  }, [status]);

  const handleSavePress = useCallback(() => {
    requireAuth('saving places', () => setShowStatusPicker(true));
  }, [requireAuth]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={selectedCity.region}
        showsUserLocation
        showsMyLocationButton
        mapPadding={{ top: 120, right: 0, bottom: 0, left: 0 }}
      >
        {cityNeighborhoods.map((neighborhood) => (
          <MapMarker
            key={neighborhood.id}
            neighborhood={neighborhood}
            coords={neighborhoodCoords[neighborhood.id]}
            isSelected={selectedNeighborhood === neighborhood.id}
            statusInfo={getStatusInfo(neighborhood.id)}
            onPress={() => setSelectedNeighborhood(neighborhood.id)}
          />
        ))}

        {/* Destination markers */}
        {destinations.map((destination, index) => (
          <Marker
            key={destination.id}
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.label}
            description={destination.address}
          >
            <View style={[styles.destinationMarker, { backgroundColor: DESTINATION_COLORS[index % DESTINATION_COLORS.length] }]}>
              <Ionicons name="flag" size={20} color="white" />
            </View>
          </Marker>
        ))}

        {/* Lines from selected neighborhood to destinations */}
        {selectedNeighborhood && neighborhoodCoords[selectedNeighborhood] && destinations.map((destination, index) => (
          <Polyline
            key={`line-${destination.id}`}
            coordinates={[
              neighborhoodCoords[selectedNeighborhood],
              { latitude: destination.latitude, longitude: destination.longitude },
            ]}
            strokeColor={DESTINATION_COLORS[index % DESTINATION_COLORS.length]}
            strokeWidth={2}
            lineDashPattern={[5, 5]}
          />
        ))}
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + SPACING.xl }]}>
        <Text style={styles.title}>Map</Text>
        <TouchableOpacity
          style={styles.destinationsButton}
          onPress={() => navigation.navigate('Destinations')}
        >
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.destinationsButtonText}>Destinations</Text>
        </TouchableOpacity>
      </View>

      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={centerOnUserLocation}
      >
        <Ionicons name="locate" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {selectedNeighborhoodData && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoTitleContainer}>
              <Text style={styles.infoTitle}>{selectedNeighborhoodData.name}</Text>
              <Text style={styles.infoBorough}>{selectedNeighborhoodData.borough}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNeighborhood(null)}>
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <Text style={styles.infoDescription} numberOfLines={2}>
            {selectedNeighborhoodData.description}
          </Text>

          <View style={styles.infoStats}>
            <NeighborhoodStats neighborhood={selectedNeighborhoodData} variant="compact" currencySymbol={selectedCity.currencySymbol} />
          </View>

          {commuteData.length > 0 && (
            <View style={styles.commuteSection}>
              <Text style={styles.commuteSectionTitle}>Commute Times</Text>
              {commuteData.map((commute) => (
                <View key={commute.destination.id} style={styles.commuteItem}>
                  <View style={[styles.commuteIcon, { backgroundColor: commute.color }]}>
                    <Ionicons name={commute.modeInfo.icon as keyof typeof Ionicons.glyphMap} size={12} color="white" />
                  </View>
                  <Text style={styles.commuteLabel}>{commute.destination.label}</Text>
                  <Text style={styles.commuteTime}>{commute.time}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, currentStatus && styles.quickActionButtonActive]}
              onPress={handleSavePress}
            >
              <Ionicons
                name={currentStatus ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={currentStatus ? COLORS.primary : COLORS.gray500}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, comparison.includes(selectedNeighborhoodData.id) && styles.quickActionButtonActive]}
              onPress={() => toggleComparison(selectedNeighborhoodData.id)}
            >
              <Ionicons
                name={comparison.includes(selectedNeighborhoodData.id) ? 'git-compare' : 'git-compare-outline'}
                size={20}
                color={comparison.includes(selectedNeighborhoodData.id) ? COLORS.primary : COLORS.gray500}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate('Detail', { neighborhood: selectedNeighborhoodData })}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <SignInPromptModal
        visible={showSignInModal}
        onClose={dismissSignInModal}
        featureName="saving places"
      />

      {selectedNeighborhoodData && (
        <StatusPickerModal
          visible={showStatusPicker}
          onClose={() => setShowStatusPicker(false)}
          currentStatus={currentStatus}
          onSelectStatus={(newStatus) => setNeighborhoodStatus(selectedNeighborhoodData.id, newStatus)}
          neighborhoodName={selectedNeighborhoodData.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  destinationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
  },
  destinationsButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  myLocationButton: {
    position: 'absolute',
    top: 130,
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: 'white',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoTitleContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  infoBorough: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  infoDescription: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoStats: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  commuteSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  commuteSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commuteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commuteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commuteLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray500,
  },
  commuteTime: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  quickActionButtonActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray200,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.sm,
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
