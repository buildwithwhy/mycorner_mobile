import type { Ionicons } from '@expo/vector-icons';
import type { SpotCategory, EventCategory } from '../types';

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

export const EVENT_CATEGORY_ICONS: Record<EventCategory, keyof typeof Ionicons.glyphMap> = {
  market: 'cart-outline',
  music: 'musical-notes-outline',
  community: 'people-outline',
  food: 'restaurant-outline',
  art: 'color-palette-outline',
  seasonal: 'sunny-outline',
  other: 'calendar-outline',
};
