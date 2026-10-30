// Review fixtures for the community sections — NOT shipped app data.
// Real seed content lives in src/data/events/ and src/data/showcases/ once the
// review-queue promotion flow produces it. Nothing here is imported by app code.
//
// neighborhoodId '1' = Shoreditch (london).

import type { BusinessShowcase, NeighborhoodEvent } from '../../../types';

/** Full slice: several events across categories and both schedule shapes. */
export const fullEvents: NeighborhoodEvent[] = [
  {
    id: 'event-shoreditch-market',
    neighborhoodId: '1',
    title: 'Shoreditch Sunday Market',
    category: 'market',
    description:
      'Street food, vintage stalls and makers along Brick Lane every weekend — arrive hungry.',
    venue: 'Brick Lane Yard',
    schedule: { kind: 'recurring', pattern: 'Every Sunday 10am–4pm' },
    source: 'editorial',
    verifiedAt: '2026-10-24',
  },
  {
    id: 'event-shoreditch-open-studios',
    neighborhoodId: '1',
    title: 'Open Studios Weekend',
    category: 'art',
    description:
      'Local artists throw open their studio doors across the alleyways off Hoxton Square.',
    venue: 'Hoxton Square area',
    schedule: { kind: 'date', startDate: '2026-11-14', endDate: '2026-11-15' },
    source: 'editorial',
    verifiedAt: '2026-10-24',
  },
  {
    id: 'event-shoreditch-jazz',
    neighborhoodId: '1',
    title: 'Basement Jazz Sessions',
    category: 'music',
    description: 'Late-night quartet sets in a rail-arch basement. Cash on the door.',
    venue: 'The Arch, Kingsland Road',
    placeId: 'fixture-place-id-jazz',
    schedule: { kind: 'recurring', pattern: 'Fridays 8pm' },
    source: 'editorial',
    verifiedAt: '2026-10-24',
  },
  {
    id: 'event-shoreditch-supper-club',
    neighborhoodId: '1',
    title: 'Harvest Supper Club',
    category: 'food',
    description: 'A long-table dinner cooked by neighborhood cooks, BYO bottle.',
    venue: 'Shoreditch Town Hall annexe',
    schedule: { kind: 'date', startDate: '2026-11-21' },
    source: 'editorial',
    verifiedAt: '2026-10-24',
  },
];

/** Sparse slice: a single event — smallest list the section should render well. */
export const sparseEvents: NeighborhoodEvent[] = [fullEvents[0]];

/** Full slice: showcases with and without perks. */
export const fullShowcases: BusinessShowcase[] = [
  {
    id: 'showcase-shoreditch-roastery',
    neighborhoodId: '1',
    placeId: 'fixture-place-id-roastery',
    name: 'Signal Roastery',
    spotlight:
      'Small-batch roastery with a two-table counter; the flat white is the neighborhood benchmark.',
    perk: { label: '10% off for locals on weekdays', terms: 'Show any order history' },
    category: 'cafe',
  },
  {
    id: 'showcase-shoreditch-records',
    neighborhoodId: '1',
    placeId: 'fixture-place-id-records',
    name: 'Press & Vinyl',
    spotlight: 'Second-hand records and a listening booth at the back. No algorithm, all crates.',
    category: 'shop',
  },
  {
    id: 'showcase-shoreditch-tavern',
    neighborhoodId: '1',
    placeId: 'fixture-place-id-tavern',
    name: 'The Old Crown Tavern',
    spotlight: 'Victorian corner pub with a proper fireplace and a Sunday roast worth booking.',
    perk: { label: 'Free pudding with roasts on Sundays' },
    category: 'restaurant',
  },
];

/** Sparse slice: a single showcase. */
export const sparseShowcases: BusinessShowcase[] = [fullShowcases[0]];
