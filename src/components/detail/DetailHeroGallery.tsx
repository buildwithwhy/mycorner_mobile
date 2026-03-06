import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';

const HERO_HEIGHT = 280;

export interface GalleryImage {
  uri?: string;
  isDefault?: boolean;
  source?: ImageSourcePropType;
}

interface DetailHeroGalleryProps {
  galleryImages: GalleryImage[];
  currentPhotosCount: number;
  neighborhoodName: string;
  borough: string;
  screenWidth: number;
  onGoBack: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (uri: string) => void;
}

function DetailHeroGalleryInner({
  galleryImages,
  currentPhotosCount,
  neighborhoodName,
  borough,
  screenWidth,
  onGoBack,
  onAddPhoto,
  onDeletePhoto,
}: DetailHeroGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);

  const getGalleryItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      setActiveImageIndex(index);
    },
    [screenWidth],
  );

  const renderGalleryItem = useCallback(
    ({ item }: { item: GalleryImage }) => {
      const isUserPhoto = !item.isDefault && item.uri;

      return (
        <View style={[styles.gallerySlide, { width: screenWidth }]}>
          {item.isDefault ? (
            <Image source={item.source} style={styles.heroImage} />
          ) : (
            <Image source={{ uri: item.uri }} style={styles.heroImage} />
          )}

          {/* Delete button for user photos */}
          {isUserPhoto && (
            <TouchableOpacity
              style={styles.deletePhotoButton}
              onPress={() => onDeletePhoto(item.uri!)}
            >
              <Ionicons name="trash" size={18} color={COLORS.white} />
            </TouchableOpacity>
          )}

          {/* Photo type indicator */}
          <View style={styles.photoTypeIndicator}>
            <Ionicons
              name={item.isDefault ? 'image' : 'camera'}
              size={14}
              color={COLORS.white}
            />
            <Text style={styles.photoTypeText}>
              {item.isDefault ? 'Neighborhood' : 'My Photo'}
            </Text>
          </View>
        </View>
      );
    },
    [onDeletePhoto, screenWidth],
  );

  return (
    <View style={styles.heroContainer}>
      {galleryImages.length > 0 ? (
        <>
          <FlatList
            ref={galleryRef}
            data={galleryImages}
            renderItem={renderGalleryItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            keyExtractor={(_, index) => index.toString()}
            getItemLayout={getGalleryItemLayout}
            initialNumToRender={2}
          />

          {/* Gallery pagination dots */}
          {galleryImages.length > 1 && (
            <View style={styles.paginationDots}>
              {galleryImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.heroInitial}>{neighborhoodName[0]}</Text>
          <Text style={styles.heroPlaceholderText}>{borough}</Text>
        </View>
      )}

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Add photo button */}
      <TouchableOpacity style={styles.addPhotoButton} onPress={onAddPhoto}>
        <Ionicons name="camera-outline" size={20} color={COLORS.white} />
      </TouchableOpacity>

      {/* Photo count badge */}
      {currentPhotosCount > 0 && (
        <View style={styles.photoCountBadge}>
          <Ionicons name="images" size={14} color={COLORS.white} />
          <Text style={styles.photoCountText}>{currentPhotosCount}</Text>
        </View>
      )}
    </View>
  );
}

export const DetailHeroGallery = React.memo(DetailHeroGalleryInner);

const styles = StyleSheet.create({
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: COLORS.gray200,
  },
  gallerySlide: {
    height: HERO_HEIGHT,
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
    fontSize: 72,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  heroPlaceholderText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 50,
    right: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  photoCountText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  photoTypeIndicator: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  photoTypeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.white,
  },
  paginationDots: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
});
