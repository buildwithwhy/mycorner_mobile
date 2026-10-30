import type { NeighborhoodEvent } from '../../types/community';

/**
 * Editorial seed events — London.
 *
 * Every event anchors to a real venue that either appears in
 * src/data/curatedSpots/london.ts or is a long-established public market /
 * institution. Schedules are famous, stable cadences; the freshness auditor
 * (agentic round one) re-verifies each record against its verifiedAt date.
 * Nothing is included that could not be verified — if a neighborhood has no
 * verifiable recurring event, it has no entry here yet.
 */

export const londonEvents: NeighborhoodEvent[] = [
  // === SHOREDITCH (id: 1) ===
  {
    id: 'event-1-1',
    neighborhoodId: '1',
    title: 'Brick Lane Market',
    category: 'market',
    description:
      'The East London Sunday institution — vintage stalls, street food, and record crates spilling down the pavement.',
    venue: 'Brick Lane',
    schedule: { kind: 'recurring', pattern: 'Every Sunday, roughly 8am–3pm' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === GREENWICH (id: 5) ===
  {
    id: 'event-5-1',
    neighborhoodId: '5',
    title: 'Greenwich Market',
    category: 'market',
    description:
      'A covered Victorian market of independent makers and street food, a short walk from the river and the Observatory.',
    venue: 'Greenwich Market',
    schedule: { kind: 'recurring', pattern: 'Tuesdays to Sundays, 10am–5:30pm' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === BRIXTON (id: 3) ===
  {
    id: 'event-3-1',
    neighborhoodId: '3',
    title: 'Brixton Village & Market Row',
    category: 'market',
    description:
      'Two covered arcades where the daytime market gives way to one of London\u2019s best eating rooms, any night of the week.',
    venue: 'Brixton Village & Market Row',
    schedule: { kind: 'recurring', pattern: 'Every day; traders generally trade late Thursday to Saturday' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === BERMONDSEY (id: 21) ===
  {
    id: 'event-21-1',
    neighborhoodId: '21',
    title: 'Maltby Street Market',
    category: 'food',
    description:
      'A railway-arch food market under the Bermondsey line — small traders, big reputations, a Saturday crowd that knows its producers.',
    venue: 'Maltby Street Market',
    schedule: { kind: 'recurring', pattern: 'Weekends, roughly 9am–3pm' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === PECKHAM (id: 9) ===
  {
    id: 'event-9-1',
    neighborhoodId: '9',
    title: 'Frank\u2019s Cafe rooftop season',
    category: 'food',
    description:
      'Campari and Aperol Spritzes on the multi-storey car park roof \u2014 with a view over the whole of south-east London. Summer only, and worth the queue.',
    venue: 'Frank\u2019s Cafe, Peckham multi-storey car park',
    schedule: { kind: 'recurring', pattern: 'Summer season, roughly June to September, weather permitting' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === WALTHAMSTOW (id: 28) ===
  {
    id: 'event-28-1',
    neighborhoodId: '28',
    title: 'Walthamstow Market',
    category: 'market',
    description:
      'Claimed to be Europe\u2019s longest daily street market \u2014 a mile of stalls running the length of the high street.',
    venue: 'Walthamstow Market',
    schedule: { kind: 'recurring', pattern: 'Mondays to Saturdays, daytime' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === CLERKENWELL (id: 64) ===
  {
    id: 'event-64-1',
    neighborhoodId: '64',
    title: 'Clerkenwell Design Week',
    category: 'art',
    description:
      'The design world decamps to Clerkenwell each May \u2014 showroom openings, installations, and talks across the district, mostly free with registration.',
    venue: 'Various venues across Clerkenwell',
    schedule: { kind: 'recurring', pattern: 'Three days every May' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === DEPTFORD (id: 33) ===
  {
    id: 'event-33-1',
    neighborhoodId: '33',
    title: 'Deptford Market',
    category: 'market',
    description:
      'Rough-edged and brilliant \u2014 antiques, fabric, and food stalls around Deptford High Street and the railway arches.',
    venue: 'Deptford Market',
    schedule: { kind: 'recurring', pattern: 'Wednesdays to Saturdays, liveliest on Fridays and Saturdays' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === MARYLEBONE (id: 39) ===
  {
    id: 'event-39-1',
    neighborhoodId: '39',
    title: 'Marylebone Farmers\u2019 Market',
    category: 'market',
    description:
      'A well-loved Sunday produce market \u2014 butchers, bakers, and seasonal growers drawing a loyal local queue.',
    venue: 'Marylebone Farmers\u2019 Market',
    schedule: { kind: 'recurring', pattern: 'Every Sunday, 10am\u20132pm' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === EAST DULWICH (id: 56) ===
  {
    id: 'event-56-1',
    neighborhoodId: '56',
    title: 'North Cross Road market',
    category: 'market',
    description:
      'A compact Saturday street of food stalls, plants, and vintage finds \u2014 the weekly ritual that anchors East Dulwich weekends.',
    venue: 'North Cross Road',
    schedule: { kind: 'recurring', pattern: 'Every Saturday, daytime' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === KENSINGTON (id: 29) ===
  {
    id: 'event-29-1',
    neighborhoodId: '29',
    title: 'Opera Holland Park summer season',
    category: 'music',
    description:
      'Open-air opera under the lime trees of Holland Park \u2014 a summer season that runs the range from Puccini to premieres.',
    venue: 'Opera Holland Park, Holland Park',
    schedule: { kind: 'recurring', pattern: 'Summer season, roughly June to August' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },

  // === WIMBLEDON (id: 10) ===
  {
    id: 'event-10-1',
    neighborhoodId: '10',
    title: 'The Championships, Wimbledon',
    category: 'seasonal',
    description:
      'Two weeks each summer when the neighborhood becomes the centre of the sporting world \u2014 queue culture, strawberries, and Centre Court.',
    venue: 'All England Lawn Tennis Club, Church Road',
    schedule: { kind: 'recurring', pattern: 'Two weeks annually, late June to mid-July' },
    source: 'editorial',
    verifiedAt: '2026-10-30',
  },
];
