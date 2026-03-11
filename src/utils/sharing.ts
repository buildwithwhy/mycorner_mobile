import { Share, Platform } from 'react-native';
import { Neighborhood } from '../data/neighborhoods';
import type { Itinerary } from '../types';
import logger from './logger';

/**
 * Format neighborhood data into a shareable message
 */
export function formatNeighborhoodShareMessage(neighborhood: Neighborhood, currencySymbol: string = '£'): string {
  const stats = [
    `Safety: ${neighborhood.safety}/5`,
    `Transit: ${neighborhood.transit}/5`,
    `Green Space: ${neighborhood.greenSpace}/5`,
  ].join(' | ');

  const affordabilitySymbol = currencySymbol.repeat(Math.max(1, 6 - neighborhood.affordability));

  const highlights = neighborhood.highlights.slice(0, 3).join(', ');

  return `Check out ${neighborhood.name} in ${neighborhood.borough}!

${neighborhood.description}

${affordabilitySymbol} | ${stats}

Highlights: ${highlights}

Discovered on MyCorner - Find your perfect neighborhood`;
}

/**
 * Generate a deep link for a neighborhood (for future use)
 */
export function getNeighborhoodDeepLink(neighborhoodId: string): string {
  // For now, return a placeholder URL format
  // Later this can link to a web preview or app deep link
  return `https://mycorner.app/n/${neighborhoodId}`;
}

/**
 * Share a neighborhood via native share sheet
 */
export async function shareNeighborhood(neighborhood: Neighborhood, currencySymbol: string = '£'): Promise<boolean> {
  const message = formatNeighborhoodShareMessage(neighborhood, currencySymbol);
  const url = getNeighborhoodDeepLink(neighborhood.id);

  try {
    const result = await Share.share(
      Platform.select({
        ios: {
          message: message,
          url: url, // iOS can have separate message and URL
        },
        default: {
          message: `${message}\n\n${url}`, // Android combines them
        },
      }) as { message: string; url?: string }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    logger.error('Error sharing neighborhood:', error);
    return false;
  }
}

/**
 * Share a comparison of neighborhoods
 */
export async function shareComparison(neighborhoods: Neighborhood[], currencySymbol: string = '£'): Promise<boolean> {
  if (neighborhoods.length === 0) return false;

  const header = `Comparing ${neighborhoods.length} neighborhoods on MyCorner:\n\n`;

  const summaries = neighborhoods.map(n => {
    const affordability = currencySymbol.repeat(Math.max(1, 6 - n.affordability));
    return `${n.name} (${n.borough})\n${affordability} | Safety ${n.safety}/5 | Transit ${n.transit}/5`;
  }).join('\n\n');

  const message = `${header}${summaries}\n\nFind your perfect neighborhood with MyCorner`;

  try {
    const result = await Share.share({ message });
    return result.action === Share.sharedAction;
  } catch (error) {
    logger.error('Error sharing comparison:', error);
    return false;
  }
}

/**
 * Share an itinerary via native share sheet
 */
export async function shareItinerary(
  itinerary: Itinerary,
  neighborhoodName: string,
): Promise<boolean> {
  const header = `My ${neighborhoodName} Itinerary (${itinerary.stops.length} stops)\n`;

  const stops = itinerary.stops.map((stop, i) => {
    const walkInfo = stop.walkTimeFromPrevious
      ? ` (${stop.walkTimeFromPrevious} walk)`
      : '';
    return `${i + 1}. ${stop.spot.name}${walkInfo}`;
  }).join('\n');

  const footer = itinerary.totalWalkTime
    ? `\nTotal walk: ${itinerary.totalWalkTime}`
    : '';

  const message = `${header}\n${stops}${footer}\n\nPlanned with MyCorner`;

  try {
    const result = await Share.share({ message });
    return result.action === Share.sharedAction;
  } catch (error) {
    logger.error('Error sharing itinerary:', error);
    return false;
  }
}
