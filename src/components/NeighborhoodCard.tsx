import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Neighborhood } from '../data/neighborhoods';
import { NeighborhoodStatus } from '../contexts/AppContext';
import { COLORS, STATUS_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import SignInPromptModal from './SignInPromptModal';
import StatusPickerModal from './StatusPickerModal';
import AffordabilityBadge from './AffordabilityBadge';

interface NeighborhoodCardProps {
  neighborhood: Neighborhood;
  onPress: () => void;
  currentStatus: NeighborhoodStatus;
  isInComparison: boolean;
  onSetStatus: (status: NeighborhoodStatus) => void;
  onToggleComparison: () => void;
}

const getStatusInfo = (status: NeighborhoodStatus) => {
  if (status === 'shortlist') return { icon: 'star' as const, color: STATUS_COLORS.shortlist, label: 'Shortlist' };
  if (status === 'want_to_visit') return { icon: 'bookmark' as const, color: STATUS_COLORS.want_to_visit, label: 'Want to Visit' };
  if (status === 'visited') return { icon: 'checkmark-circle' as const, color: STATUS_COLORS.visited, label: 'Visited' };
  if (status === 'living_here') return { icon: 'home' as const, color: STATUS_COLORS.living_here, label: 'Living Here' };
  if (status === 'ruled_out') return { icon: 'close-circle' as const, color: STATUS_COLORS.ruled_out, label: 'Ruled Out' };
  return null;
};

export default function NeighborhoodCard({
  neighborhood,
  onPress,
  currentStatus,
  isInComparison,
  onSetStatus,
  onToggleComparison,
}: NeighborhoodCardProps) {
  const { session } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const statusInfo = getStatusInfo(currentStatus);

  const handleAddToPlaces = () => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setShowStatusPicker(true);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{neighborhood.name}</Text>
            <Text style={styles.cardBorough}>{neighborhood.borough}</Text>
          </View>
          {statusInfo && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
              <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {neighborhood.description}
        </Text>

        <View style={styles.highlights}>
          {neighborhood.highlights.slice(0, 3).map((highlight, index) => (
            <View key={index} style={styles.highlightTag}>
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="cash-outline" size={16} color={COLORS.gray500} />
            <AffordabilityBadge value={neighborhood.affordability} />
          </View>

          <View style={styles.stat}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.gray500} />
            <Text style={styles.statText}>{neighborhood.safety}/5</Text>
          </View>

          <View style={styles.stat}>
            <Ionicons name="bus" size={16} color={COLORS.gray500} />
            <Text style={styles.statText}>{neighborhood.transit}/5</Text>
          </View>

          <View style={styles.stat}>
            <Ionicons name="leaf" size={16} color={COLORS.gray500} />
            <Text style={styles.statText}>{neighborhood.greenSpace}/5</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardActionButton, currentStatus && styles.cardActionButtonSaved]}
          onPress={handleAddToPlaces}
        >
          <Ionicons
            name={currentStatus ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={currentStatus ? COLORS.primary : COLORS.gray400}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardActionButton, isInComparison && styles.cardActionButtonCompare]}
          onPress={onToggleComparison}
        >
          <Ionicons
            name={isInComparison ? 'git-compare' : 'git-compare-outline'}
            size={18}
            color={isInComparison ? COLORS.primary : COLORS.gray500}
          />
        </TouchableOpacity>
      </View>

      <SignInPromptModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        featureName="saving places"
      />

      <StatusPickerModal
        visible={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        currentStatus={currentStatus}
        onSelectStatus={onSetStatus}
        neighborhoodName={neighborhood.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  cardBorough: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  highlightTag: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  highlightText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  cardActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardActionButtonSaved: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  cardActionButtonCompare: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
});
