import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCity } from '../contexts/CityContext';
import { City } from '../data/cities';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

interface CitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

export function CitySelectorModal({ visible, onClose, isFirstLaunch = false }: CitySelectorModalProps) {
  const { cities, selectedCityId, setSelectedCity, confirmCitySelection } = useCity();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Slide up when visible
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Reset position when hidden
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  const handleSelectCity = (cityId: string) => {
    // Update city selection (fire and forget - don't wait)
    setSelectedCity(cityId);

    if (isFirstLaunch) {
      confirmCitySelection();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={isFirstLaunch ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            isFirstLaunch && styles.modalContentFirstLaunch,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {!isFirstLaunch && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          )}

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isFirstLaunch ? 'Welcome to MyCorner' : 'Select City'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isFirstLaunch
                ? 'Choose a city to start exploring neighborhoods'
                : 'Switch between cities to explore different neighborhoods'
              }
            </Text>
          </View>

          <View style={styles.cityList}>
            {cities.map((city) => (
              <CityOption
                key={city.id}
                city={city}
                isSelected={city.id === selectedCityId}
                onSelect={() => handleSelectCity(city.id)}
              />
            ))}
          </View>

          {isFirstLaunch && (
            <Text style={styles.footerNote}>
              You can change this later from the home screen
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface CityOptionProps {
  city: City;
  isSelected: boolean;
  onSelect: () => void;
}

function CityOption({ city, isSelected, onSelect }: CityOptionProps) {
  return (
    <Pressable
      style={[styles.cityOption, isSelected && styles.cityOptionSelected]}
      onPress={onSelect}
    >
      <Text style={styles.cityFlag}>{city.flag}</Text>
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
          {city.name}
        </Text>
        <Text style={styles.cityCountry}>{city.country}</Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </Pressable>
  );
}

interface CityHeaderSelectorProps {
  onPress: () => void;
}

export function CityHeaderSelector({ onPress }: CityHeaderSelectorProps) {
  const { selectedCity } = useCity();

  return (
    <TouchableOpacity style={styles.headerSelector} onPress={onPress}>
      <Text style={styles.headerFlag}>{selectedCity.flag}</Text>
      <Text style={styles.headerCityName}>{selectedCity.name}</Text>
      <Ionicons name="chevron-down" size={16} color={COLORS.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalContentFirstLaunch: {
    paddingTop: SPACING.xxxl,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1,
    padding: SPACING.xs,
  },
  modalHeader: {
    marginBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  cityList: {
    gap: SPACING.md,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cityOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  cityFlag: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  cityNameSelected: {
    color: COLORS.primary,
  },
  cityCountry: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  footerNote: {
    marginTop: SPACING.xxl,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  // Header selector styles
  headerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  headerFlag: {
    fontSize: 16,
  },
  headerCityName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
