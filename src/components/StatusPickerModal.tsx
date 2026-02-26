import React, { useRef, useEffect } from 'react';
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
import { COLORS, STATUS_CONFIG, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Subheading, Body, Caption } from './Typography';

const STATUS_OPTIONS = (Object.entries(STATUS_CONFIG) as [NonNullable<NeighborhoodStatus>, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(
  ([value, config]) => ({ value: value as NeighborhoodStatus, ...config })
);

interface StatusPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentStatus: NeighborhoodStatus;
  onSelectStatus: (status: NeighborhoodStatus) => void;
  neighborhoodName?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 50;
const MODAL_HEIGHT = 500; // Approximate height for animation

export default function StatusPickerModal({
  visible,
  onClose,
  currentStatus,
  onSelectStatus,
  neighborhoodName,
}: StatusPickerModalProps) {
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
      ]).start();
    }
  }, [visible]);

  const animateClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: MODAL_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

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
          animateClose(onClose);
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
    animateClose(onClose);
  };

  const handleClose = () => {
    animateClose(onClose);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
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
        </Animated.View>
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
