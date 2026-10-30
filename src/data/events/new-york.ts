import type { NeighborhoodEvent } from '../../types/community';

/**
 * Editorial seed events — New York.
 *
 * Every event anchors to a real venue that either appears in
 * src/data/curatedSpots/new-york.ts or is a long-established public market /
 * institution. Schedules are famous, stable cadences; the freshness auditor
 * (agentic round one) re-verifies each record against its verifiedAt date.
 * Nothing is included that could not be verified — if a neighborhood has no
 * verifiable recurring event, it has no entry here yet.
 */

export const newYorkEvents: NeighborhoodEvent[] = [
  // === WILLIAMSBURG (id: ny-11) ===
  {
    id: 'event-ny-11-1',
    neighborhoodId: 'ny-11',
    title: 'Smorgasburg',
    category: 'food',
    description:
      'The open-air food market that launched a hundred food careers — dozens of vendors on the Williamsburg waterfront.',
    venue: 'Smorgasburg',
    schedule: { kind: 'recurring', pattern: 'Weekends, April through October season' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === HELL'S KITCHEN (id: ny-10) ===
  {
    id: 'event-ny-10-1',
    neighborhoodId: 'ny-10',
    title: 'Ninth Avenue International Food Festival',
    category: 'food',
    description:
      'Ninth Avenue closes to traffic for a weekend of food stalls from the neighborhood\u2019s own kitchens \u2014 a Hell\u2019s Kitchen tradition for decades.',
    venue: 'Ninth Avenue',
    schedule: { kind: 'recurring', pattern: 'One weekend each May' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === GREENWICH VILLAGE (id: ny-3) ===
  {
    id: 'event-ny-3-1',
    neighborhoodId: 'ny-3',
    title: 'Blue Note live jazz',
    category: 'music',
    description:
      'The Village\u2019s storied jazz basement runs nightly sets \u2014 from living legends to the emerging roster, usually two shows a night.',
    venue: 'Blue Note Jazz Club',
    schedule: { kind: 'recurring', pattern: 'Nightly, typically two sets per evening' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === EAST VILLAGE (id: ny-7) ===
  {
    id: 'event-ny-7-1',
    neighborhoodId: 'ny-7',
    title: 'Tompkins Square Park Halloween Dog Parade',
    category: 'community',
    description:
      'Dogs in costumes, thousands of spectators \u2014 the city\u2019s most reliably delightful Halloween tradition, a week or so before the human parade.',
    venue: 'Tompkins Square Park',
    schedule: { kind: 'recurring', pattern: 'Annually in October, on a date announced each fall' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },
  {
    id: 'event-ny-7-2',
    neighborhoodId: 'ny-7',
    title: 'Tompkins Square Greenmarket',
    category: 'market',
    description:
      'The East Village\u2019s weekly farmers\u2019 market on the park\u2019s west edge \u2014 produce, bread, and flowers from regional farms.',
    venue: 'Tompkins Square Park',
    schedule: { kind: 'recurring', pattern: 'Every Sunday, morning to early afternoon' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === LOWER EAST SIDE (id: ny-8) ===
  {
    id: 'event-ny-8-1',
    neighborhoodId: 'ny-8',
    title: 'Hester Street Fair',
    category: 'market',
    description:
      'A maker-and-food market with roots going back to the pushcart era \u2014 vintage, small-batch food, and local vendors on the Lower East Side.',
    venue: 'Hester Street Fair',
    schedule: { kind: 'recurring', pattern: 'Weekends, roughly April through October' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === FORDHAM / BELMONT (id: ny-28) ===
  {
    id: 'event-ny-28-1',
    neighborhoodId: 'ny-28',
    title: 'Arthur Avenue Retail Market',
    category: 'market',
    description:
      'The indoor market at the heart of the Bronx\u2019s Little Italy \u2014 bread, cheese, and espresso stalls that have fed Belmont for generations.',
    venue: 'Arthur Avenue Retail Market',
    schedule: { kind: 'recurring', pattern: 'Mondays to Saturdays, daytime' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === DUMBO (id: ny-12) ===
  {
    id: 'event-ny-12-1',
    neighborhoodId: 'ny-12',
    title: 'DUMBO First Thursday Gallery Walk',
    category: 'art',
    description:
      'On the first Thursday of each month the neighborhood\u2019s galleries stay open late \u2014 openings, artist talks, and the waterfront stroll between them.',
    venue: 'DUMBO galleries',
    schedule: { kind: 'recurring', pattern: 'First Thursday of the month, early evening' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },
];
