import type { Ionicons } from '@expo/vector-icons';
import type { SpotCategory } from '../types';

export const CATEGORY_ICONS: Record<SpotCategory, keyof typeof Ionicons.glyphMap> = {
  cafe: 'cafe-outline',
  restaurant: 'restaurant-outline',
  bar: 'beer-outline',
  park: 'leaf-outline',
  market: 'cart-outline',
  museum: 'business-outline',
  shop: 'bag-outline',
  landmark: 'flag-outline',
  other: 'pin-outline',
};
