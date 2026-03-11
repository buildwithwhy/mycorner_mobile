import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Neighborhood } from '../data/neighborhoods';
import { NeighborhoodStatus } from '../contexts/AppContext';
import { COLORS, STATUS_CONFIG, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS, BOROUGH_COLORS } from '../constants/theme';
import { getNeighborhoodImage } from '../assets/neighborhood-images';
import NeighborhoodStats from './NeighborhoodStats';

export type ViewMode = 'list' | 'card';

// Generate a consistent color based on borough name

const getBoroughColor = (borough: string): string => {
  let hash = 0;
  for (let i = 0; i < borough.length; i++) {
    hash = borough.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOROUGH_COLORS[Math.abs(hash) % BOROUGH_COLORS.length];
};

interface NeighborhoodCardProps {
  neighborhood: Neighborhood;
  onPress: () => void;
  currentStatus: NeighborhoodStatus;
  isInComparison: boolean;
  onToggleComparison: () => void;
  onAddToPlaces: (neighborhoodId: string) => void; // Lifted modal handling to parent
  onExplore?: () => void;
  viewMode?: ViewMode;
  photoCount?: number;
  firstPhotoUri?: string | null;
  matchScore?: number | null;
  currencySymbol?: string;
}


function NeighborhoodCard({
  neighborhood,
  onPress,
  currentStatus,
  isInComparison,
  onToggleComparison,
  onAddToPlaces,
  onExplore,
  viewMode = 'list',
  photoCount = 0,
  firstPhotoUri = null,
  matchScore = null,
  currencySymbol = '£',
}: NeighborhoodCardProps) {
  const statusInfo = currentStatus ? STATUS_CONFIG[currentStatus] : null;
  const hasPhotos = photoCount > 0;

  // Memoize borough color to avoid recalculating on every render
  const boroughColor = useMemo(
    () => getBoroughColor(neighborhood.borough),
    [neighborhood.borough]
  );

  // Memoize image sources to avoid creating new objects on every render
  const photoImageSource = useMemo(
    () => firstPhotoUri ? { uri: firstPhotoUri } : null,
    [firstPhotoUri]
  );

  const defaultImageSource = useMemo(
    () => getNeighborhoodImage(neighborhood.id),
    [neighborhood.id]
  );

  const handleAddToPlaces = useCallback(() => {
    onAddToPlaces(neighborhood.id);
  }, [onAddToPlaces, neighborhood.id]);

  const handleExplore = useCallback(() => {
    onExplore?.();
  }, [onExplore]);

  // Card view renders with hero image
  if (viewMode === 'card') {
    return (
      <View style={styles.cardViewContainer}>
        <TouchableOpacity
          style={styles.cardViewTouchable}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityLabel={neighborhood.name}
        >
          {/* Hero Image Section */}
          <View style={styles.heroSection}>
            {photoImageSource ? (
              <Image source={photoImageSource} style={styles.heroImage} />
            ) : defaultImageSource ? (
              <Image source={defaultImageSource} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroPlaceholder, { backgroundColor: boroughColor }]}>
                <Text style={styles.heroInitial}>{neighborhood.name[0]}</Text>
                <Text style={styles.heroPlaceholderText}>{neighborhood.borough}</Text>
              </View>
            )}

            {/* Overlay badges */}
            <View style={styles.heroOverlay}>
              {matchScore !== null && (
                <View style={[styles.matchScoreBadge, matchScore >= 90 && styles.matchScoreBadgeTop]}>
                  <Ionicons name="trophy" size={10} color={COLORS.white} />
                  <Text style={styles.matchScoreText}>Top {matchScore}%</Text>
                </View>
              )}
              {statusInfo && (
                <View style={[styles.heroStatusBadge, { backgroundColor: statusInfo.color }]}>
                  <Ionicons name={statusInfo.icon} size={14} color={COLORS.white} />
                </View>
              )}
              {hasPhotos && (
                <View style={styles.heroPhotoBadge}>
                  <Ionicons name="camera" size={12} color={COLORS.white} />
                  <Text style={styles.heroPhotoCount}>{photoCount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.cardViewContent}>
            <Text style={styles.cardViewTitle}>{neighborhood.name}</Text>
            <Text style={styles.cardViewBorough}>{neighborhood.borough}</Text>
            <NeighborhoodStats neighborhood={neighborhood} variant="compact" currencySymbol={currencySymbol} />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.cardViewActions}>
          <TouchableOpacity
            style={[styles.cardViewActionButton, currentStatus && styles.cardViewActionButtonActive]}
            onPress={handleAddToPlaces}
            accessibilityLabel={currentStatus ? 'Remove bookmark' : 'Bookmark'}
            accessibilityRole="button"
          >
            <Ionicons
              name={currentStatus ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={currentStatus ? COLORS.primary : COLORS.gray400}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardViewActionButton, isInComparison && styles.cardViewActionButtonActive]}
            onPress={onToggleComparison}
            accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isInComparison ? 'git-compare' : 'git-compare-outline'}
              size={16}
              color={isInComparison ? COLORS.primary : COLORS.gray400}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardViewActionButton}
            onPress={handleExplore}
            accessibilityLabel="Explore local spots"
            accessibilityRole="button"
          >
            <Ionicons
              name="compass-outline"
              size={16}
              color={COLORS.gray400}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // List view (default)
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={neighborhood.name}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{neighborhood.name}</Text>
              {matchScore !== null && (
                <View style={[styles.listMatchBadge, matchScore >= 90 && styles.listMatchBadgeTop]}>
                  <Ionicons name="trophy" size={12} color={matchScore >= 90 ? COLORS.warning : COLORS.success} />
                  <Text style={[styles.listMatchText, matchScore >= 90 && styles.listMatchTextTop]}>
                    Top {matchScore}%
                  </Text>
                </View>
              )}
              {hasPhotos && (
                <View style={styles.photoBadge}>
                  <Ionicons name="camera" size={12} color={COLORS.gray500} />
                  <Text style={styles.photoBadgeText}>{photoCount}</Text>
                </View>
              )}
            </View>
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

        <View style={styles.statsRow}>
          <NeighborhoodStats neighborhood={neighborhood} variant="standard" currencySymbol={currencySymbol} />
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardActionButton, currentStatus && styles.cardActionButtonSaved]}
          onPress={handleAddToPlaces}
          accessibilityLabel={currentStatus ? 'Remove bookmark' : 'Bookmark'}
          accessibilityRole="button"
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
          accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isInComparison ? 'git-compare' : 'git-compare-outline'}
            size={18}
            color={isInComparison ? COLORS.primary : COLORS.gray500}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardActionButton}
          onPress={handleExplore}
          accessibilityLabel="Explore local spots"
          accessibilityRole="button"
        >
          <Ionicons
            name="compass-outline"
            size={18}
            color={COLORS.gray500}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default memo(NeighborhoodCard);

const styles = StyleSheet.create({
  // === LIST VIEW STYLES ===
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  photoBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
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
  statsRow: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
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

  // === CARD VIEW STYLES ===
  cardViewContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  cardViewTouchable: {
    flex: 1,
  },
  heroSection: {
    height: 140,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  heroPlaceholderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  heroStatusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  heroPhotoCount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardViewContent: {
    padding: SPACING.md,
  },
  cardViewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  cardViewBorough: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  cardViewActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  cardViewActionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardViewActionButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },

  // === MATCH SCORE STYLES ===
  matchScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  matchScoreBadgeTop: {
    backgroundColor: COLORS.warning,
  },
  matchScoreText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  listMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  listMatchBadgeTop: {
    backgroundColor: COLORS.warningLight,
  },
  listMatchText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.success,
  },
  listMatchTextTop: {
    color: COLORS.warning,
  },
});
