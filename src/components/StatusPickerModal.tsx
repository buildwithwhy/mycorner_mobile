import React, { useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NeighborhoodStatus } from '../contexts/AppContext';
import { COLORS, STATUS_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Subheading, Body, Caption } from './Typography';

interface StatusOption {
  value: NeighborhoodStatus;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'shortlist',
    label: 'Shortlist',
    description: 'A serious contender',
    icon: 'star',
    color: STATUS_COLORS.shortlist,
  },
  {
    value: 'want_to_visit',
    label: 'Want to Visit',
    description: 'Planning to explore',
    icon: 'bookmark',
    color: STATUS_COLORS.want_to_visit,
  },
  {
    value: 'visited',
    label: 'Visited',
    description: 'Already been there',
    icon: 'checkmark-circle',
    color: STATUS_COLORS.visited,
  },
  {
    value: 'living_here',
    label: 'Living Here',
    description: 'Your current home',
    icon: 'home',
    color: STATUS_COLORS.living_here,
  },
  {
    value: 'ruled_out',
    label: 'Ruled Out',
    description: 'Not for me',
    icon: 'close-circle',
    color: STATUS_COLORS.ruled_out,
  },
];

interface StatusPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentStatus: NeighborhoodStatus;
  onSelectStatus: (status: NeighborhoodStatus) => void;
  neighborhoodName?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 50;

export default function StatusPickerModal({
  visible,
  onClose,
  currentStatus,
  onSelectStatus,
  neighborhoodName,
}: StatusPickerModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down (positive dy)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5) {
          // Dismiss the modal
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleSelectStatus = (status: NeighborhoodStatus) => {
    onSelectStatus(status);
    onClose();
    translateY.setValue(0);
  };

  const handleClose = () => {
    onClose();
    translateY.setValue(0);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[styles.modal, { transform: [{ translateY }] }]}
            >
              <Animated.View
                style={styles.handle}
                {...panResponder.panHandlers}
              >
                <View style={styles.handleBar} />
              </Animated.View>

              <View style={styles.header}>
                <Subheading>Add to My Places</Subheading>
                {neighborhoodName && (
                  <Caption color={COLORS.gray500}>{neighborhoodName}</Caption>
                )}
              </View>

              <View style={styles.options}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = currentStatus === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        isSelected && { borderColor: option.color },
                      ]}
                      onPress={() => handleSelectStatus(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
                        <Ionicons name={option.icon} size={24} color={option.color} />
                      </View>
                      <View style={styles.optionText}>
                        <Body style={styles.optionLabel}>{option.label}</Body>
                        <Caption color={COLORS.gray500}>{option.description}</Caption>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={option.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {currentStatus && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleSelectStatus(null)}
                >
                  <Body color={COLORS.error}>Remove from My Places</Body>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Body color={COLORS.gray500}>Cancel</Body>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
    maxHeight: '80%',
  },
  handle: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    marginHorizontal: SPACING.xl,
  },
  options: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    backgroundColor: COLORS.gray50,
  },
  optionSelected: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontWeight: '600',
  },
  removeButton: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
});
