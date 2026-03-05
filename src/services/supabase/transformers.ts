import type { UserRatings, Destination, DestinationRow, NeighborhoodRatingRow } from '../../types';

// Ratings: camelCase (app) -> snake_case (DB)
export function ratingsToDb(
  userId: string,
  neighborhoodId: string,
  ratings: UserRatings[string]
): Record<string, unknown> {
  const dbRatings: Record<string, unknown> = {
    user_id: userId,
    neighborhood_id: neighborhoodId,
  };
  if (ratings.affordability !== undefined) dbRatings.affordability = ratings.affordability;
  if (ratings.safety !== undefined) dbRatings.safety = ratings.safety;
  if (ratings.transit !== undefined) dbRatings.transit = ratings.transit;
  if (ratings.greenSpace !== undefined) dbRatings.green_space = ratings.greenSpace;
  if (ratings.nightlife !== undefined) dbRatings.nightlife = ratings.nightlife;
  if (ratings.familyFriendly !== undefined) dbRatings.family_friendly = ratings.familyFriendly;
  return dbRatings;
}

// Ratings: snake_case (DB) -> camelCase (app)
export function ratingsFromDb(row: NeighborhoodRatingRow): UserRatings[string] {
  return {
    affordability: row.affordability ?? undefined,
    safety: row.safety ?? undefined,
    transit: row.transit ?? undefined,
    greenSpace: row.green_space ?? undefined,
    nightlife: row.nightlife ?? undefined,
    familyFriendly: row.family_friendly ?? undefined,
  };
}

// Destinations: camelCase (app) -> snake_case (DB)
export function destinationToDb(dest: Destination, userId: string): Record<string, unknown> {
  return {
    id: dest.id,
    user_id: userId,
    city_id: dest.cityId,
    label: dest.label,
    address: dest.address,
    latitude: dest.latitude,
    longitude: dest.longitude,
    transport_mode: dest.transportMode,
  };
}

// Destinations: snake_case (DB) -> camelCase (app)
export function destinationFromDb(row: DestinationRow): Destination {
  return {
    id: row.id,
    cityId: row.city_id || 'london',
    label: row.label,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    transportMode: (row.transport_mode as Destination['transportMode']) || 'transit',
  };
}

// Destination updates: camelCase partial -> snake_case partial
export function destinationUpdatesToDb(
  updates: Partial<Omit<Destination, 'id'>>
): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.cityId !== undefined) dbUpdates.city_id = updates.cityId;
  if (updates.label !== undefined) dbUpdates.label = updates.label;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.transportMode !== undefined) dbUpdates.transport_mode = updates.transportMode;
  return dbUpdates;
}
