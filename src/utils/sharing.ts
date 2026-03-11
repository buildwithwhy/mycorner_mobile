import { Share, Platform } from 'react-native';
import { Neighborhood } from '../data/neighborhoods';
import type { Itinerary } from '../types';
import { getExploreSummary } from '../data/exploreSummaries';
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
 * Generate a deep link URL for exploring a neighborhood
 */
export function getExploreDeepLink(neighborhoodId: string): string {
  return `https://mycorner.app/n/${neighborhoodId}/explore`;
}

/**
 * Share an itinerary via native share sheet
 */
export async function shareItinerary(
  itinerary: Itinerary,
  neighborhoodName: string,
  neighborhoodId: string,
): Promise<boolean> {
  const walkSummary = itinerary.totalWalkTime
    ? `, ${itinerary.totalWalkTime} walk`
    : '';
  const header = `My ${neighborhoodName} Day Out \u2014 ${itinerary.stops.length} stops${walkSummary}`;

  const summary = getExploreSummary(neighborhoodId);
  const blurb = summary ? `\n\n\u201c${summary.blurb}\u201d` : '';

  const stops = itinerary.stops.map((stop, i) => {
    const walkInfo = stop.walkTimeFromPrevious
      ? ` \u00b7 ${stop.walkTimeFromPrevious} walk`
      : '';
    return `${i + 1}. ${stop.spot.name}${walkInfo}`;
  }).join('\n');

  const url = getExploreDeepLink(neighborhoodId);
  const cta = `Explore ${neighborhoodName} on MyCorner \ud83d\udc47\n${url}`;

  const message = `${header}${blurb}\n\n${stops}\n\n${cta}`;

  try {
    const result = await Share.share(
      Platform.select({
        ios: { message, url },
        default: { message },
      }) as { message: string; url?: string },
    );
    return result.action === Share.sharedAction;
  } catch (error) {
    logger.error('Error sharing itinerary:', error);
    return false;
  }
}
