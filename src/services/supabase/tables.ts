export const TABLE_NAMES = {
  FAVORITES: 'user_favorites',
  COMPARISON: 'user_comparison',
  STATUS: 'user_neighborhood_status',
  NOTES: 'user_neighborhood_notes',
  RATINGS: 'user_neighborhood_ratings',
  DESTINATIONS: 'user_destinations',
  PHOTOS: 'user_photos',
} as const;

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];

export const ALL_USER_TABLES: TableName[] = Object.values(TABLE_NAMES);
