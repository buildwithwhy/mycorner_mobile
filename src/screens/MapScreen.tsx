import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { neighborhoods } from '../data/neighborhoods';
import { useApp } from '../contexts/AppContext';
import { calculateDistance, estimateCommuteTime } from '../utils/commute';
import { getNeighborhoodCoordinates } from '../utils/coordinates';
import { COLORS, DESTINATION_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import AffordabilityBadge from '../components/AffordabilityBadge';

// London center coordinates
const LONDON_REGION = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

export default function MapScreen() {
  const navigation = useNavigation();
  const { destinations, favorites, toggleFavorite, comparison, toggleComparison } = useApp();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={LONDON_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {neighborhoods.map((neighborhood) => {
          const coords = getNeighborhoodCoordinates(neighborhood.id);
          const isSelected = selectedNeighborhood === neighborhood.id;

          return (
            <Marker
              key={neighborhood.id}
              coordinate={coords}
              title={neighborhood.name}
              description={neighborhood.borough}
              onPress={() => setSelectedNeighborhood(neighborhood.id)}
            >
              <View style={[styles.marker, isSelected && styles.markerSelected]}>
                <Ionicons name="location" size={24} color={isSelected ? '#6366f1' : '#6b7280'} />
              </View>
            </Marker>
          );
        })}

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
        {selectedNeighborhood && destinations.map((destination, index) => {
          const neighborhoodCoords = getNeighborhoodCoordinates(selectedNeighborhood);
          return (
            <Polyline
              key={`line-${destination.id}`}
              coordinates={[
                neighborhoodCoords,
                { latitude: destination.latitude, longitude: destination.longitude },
              ]}
              strokeColor={DESTINATION_COLORS[index % DESTINATION_COLORS.length]}
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          );
        })}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
      </View>

      {selectedNeighborhood && (
        <View style={styles.infoCard}>
          {(() => {
            const neighborhood = neighborhoods.find((n) => n.id === selectedNeighborhood);
            if (!neighborhood) return null;

            return (
              <>
                <View style={styles.infoHeader}>
                  <View style={styles.infoTitleContainer}>
                    <Text style={styles.infoTitle}>{neighborhood.name}</Text>
                    <Text style={styles.infoBorough}>{neighborhood.borough}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedNeighborhood(null)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.infoDescription} numberOfLines={2}>
                  {neighborhood.description}
                </Text>

                <View style={styles.infoStats}>
                  <View style={styles.infoStat}>
                    <Ionicons name="cash-outline" size={16} color="#6b7280" />
                    <AffordabilityBadge value={neighborhood.affordability} />
                  </View>
                  <View style={styles.infoStat}>
                    <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
                    <Text style={styles.infoStatText}>{neighborhood.safety}/5</Text>
                  </View>
                  <View style={styles.infoStat}>
                    <Ionicons name="bus" size={16} color="#6b7280" />
                    <Text style={styles.infoStatText}>{neighborhood.transit}/5</Text>
                  </View>
                  <View style={styles.infoStat}>
                    <Ionicons name="leaf" size={16} color="#6b7280" />
                    <Text style={styles.infoStatText}>{neighborhood.greenSpace}/5</Text>
                  </View>
                </View>

                {destinations.length > 0 && (
                  <View style={styles.commuteSection}>
                    <Text style={styles.commuteSectionTitle}>Commute Times</Text>
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
                          <View style={[styles.commuteIcon, { backgroundColor: DESTINATION_COLORS[index % DESTINATION_COLORS.length] }]}>
                            <Ionicons name="flag" size={12} color="white" />
                          </View>
                          <Text style={styles.commuteLabel}>{destination.label}</Text>
                          <Text style={styles.commuteTime}>{time}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, favorites.includes(neighborhood.id) && styles.quickActionButtonActive]}
                    onPress={() => toggleFavorite(neighborhood.id)}
                  >
                    <Ionicons
                      name={favorites.includes(neighborhood.id) ? 'heart' : 'heart-outline'}
                      size={20}
                      color={favorites.includes(neighborhood.id) ? '#ef4444' : '#6b7280'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickActionButton, comparison.includes(neighborhood.id) && styles.quickActionButtonActive]}
                    onPress={() => toggleComparison(neighborhood.id)}
                  >
                    <Ionicons
                      name={comparison.includes(neighborhood.id) ? 'git-compare' : 'git-compare-outline'}
                      size={20}
                      color={comparison.includes(neighborhood.id) ? '#6366f1' : '#6b7280'}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => navigation.navigate('Detail', { neighborhood })}
                >
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </>
            );
          })()}
        </View>
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
    paddingTop: 60,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    color: '#111827',
    marginBottom: 2,
  },
  infoBorough: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoStatText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  commuteSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  commuteSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
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
    color: '#6b7280',
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
