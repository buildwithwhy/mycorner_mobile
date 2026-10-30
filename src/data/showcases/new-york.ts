import type { BusinessShowcase } from '../../types/community';

/**
 * Editorial seed showcases — New York.
 *
 * INTENTIONALLY EMPTY at launch. The anti-fabrication rule (spec art_H2bNLauv)
 * requires every showcase to carry a real Google placeId, and no verified
 * placeIds exist in the dataset yet — the curated-spots placeId backfill is
 * pending and Google Maps billing is disabled (OQ1), so nothing verifiable
 * could be sourced this round. Populates via the review-queue promotion flow
 * once verified placeIds land.
 */

export const newYorkShowcases: BusinessShowcase[] = [];
