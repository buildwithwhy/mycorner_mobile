// Offline Banner Component
// Displays a banner when the device is offline

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

interface OfflineBannerProps {
  // Optional: only show if explicitly offline (not null/unknown)
  strictMode?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ strictMode = false }) => {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Determine if we should show the banner
  const isOffline = strictMode
    ? isConnected === false || isInternetReachable === false
    : isConnected === false;

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top || SPACING.sm }]}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={18} color={COLORS.white} />
        <Text style={styles.text}>You're offline. Some features may be unavailable.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray700,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  text: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
});

export default OfflineBanner;
