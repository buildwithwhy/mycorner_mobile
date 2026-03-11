import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import type { ItineraryStop } from '../../types';

interface ItineraryMapProps {
  stops: ItineraryStop[];
}

const MAP_HEIGHT = 200;
const FIT_PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

function ItineraryMapComponent({ stops }: ItineraryMapProps) {
  const mapRef = useRef<MapView>(null);

  const coordinates = useMemo(
    () =>
      stops.map((s) => ({
        latitude: s.spot.location.lat,
        longitude: s.spot.location.lng,
      })),
    [stops],
  );

  const fitToStops = useCallback(() => {
    if (mapRef.current && coordinates.length >= 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: FIT_PADDING,
        animated: false,
      });
    }
  }, [coordinates]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        onLayout={fitToStops}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {stops.map((stop, index) => (
          <Marker
            key={stop.spot.id}
            coordinate={coordinates[index]}
            title={stop.spot.name}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        <Polyline
          coordinates={coordinates}
          strokeColor={COLORS.primary}
          strokeWidth={2}
          lineDashPattern={[6, 4]}
        />
      </MapView>
    </View>
  );
}

export const ItineraryMap = React.memo(ItineraryMapComponent);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  map: {
    height: MAP_HEIGHT,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  markerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});
