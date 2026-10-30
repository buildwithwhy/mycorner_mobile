// Community content types — curated editorial events and business showcases.
// Bundled static data (src/data/events/, src/data/showcases/), following the
// curatedSpots pattern: authored in review queues, promoted by humans.

import type { SpotCategory } from './index';

// ============================================================================
// NEIGHBORHOOD EVENTS
// ============================================================================

export type EventCategory =
  | 'market'
  | 'music'
  | 'community'
  | 'food'
  | 'art'
  | 'seasonal'
  | 'other';

export type EventSchedule =
  | { kind: 'recurring'; pattern: string } // e.g. "Every Saturday 10am–4pm"
  | { kind: 'date'; startDate: string; endDate?: string }; // ISO dates

export interface NeighborhoodEvent {
  id: string;
  neighborhoodId: string; // FK into src/data/neighborhoods
  title: string;
  category: EventCategory;
  description: string; // 1–2 sentences, editorial voice
  venue: string; // free text; placeId optional for detail lookup
  placeId?: string; // reuse existing googleMaps.ts merge for live detail
  schedule: EventSchedule;
  source: 'editorial';
  verifiedAt: string; // ISO date — freshness signal for the auditor (agentic round one)
}

// ============================================================================
// BUSINESS SHOWCASES
// ============================================================================

export interface ShowcasePerk {
  label: string; // e.g. "10% off for locals on weekdays"
  terms?: string;
}

export interface BusinessShowcase {
  id: string;
  neighborhoodId: string; // FK into src/data/neighborhoods
  placeId: string; // required — showcase is anchored to a real, Places-resolvable business
  name: string;
  spotlight: string; // why this business, editorial voice
  perk?: ShowcasePerk;
  category: SpotCategory; // reuses curated spot categories
}

// Live place detail, phone, hours etc. are NOT stored — resolved at render
// time via services/googleMaps.ts, same as curated spots. Kept current
// automatically; degrades gracefully when Places is unavailable.
