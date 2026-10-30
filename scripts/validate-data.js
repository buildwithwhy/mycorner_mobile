#!/usr/bin/env node
/*
 * validate-data — the acceptance oracle for all data-coverage work.
 *
 * Re-derives every coverage number from src/data/ (never trusts stale counts in
 * audit docs) and fails with the offending neighborhood/spot id, not a bare count.
 *
 * Run from the repo root:  node scripts/validate-data.js   (or: npm run validate-data)
 * Promote warnings to errors: --strict
 *
 * Structure: parsers and checks are pure functions exported for unit testing
 * (scripts/validate-data.test.js); I/O lives only in loadContext()/main().
 * New checks are appended to the CHECKS registry — no restructuring needed.
 */
const fs = require('fs');

const DATA_FILES = {
  neighborhoods: ['src/data/neighborhoods/london.ts', 'src/data/neighborhoods/new-york.ts'],
  spots: ['src/data/curatedSpots/london.ts', 'src/data/curatedSpots/new-york.ts'],
  coordinates: ['src/data/coordinates/london.ts', 'src/data/coordinates/new-york.ts'],
  boundaries: ['src/data/boundaries/london.ts', 'src/data/boundaries/new-york.ts'],
  exploreSummaries: ['src/data/exploreSummaries/london.ts', 'src/data/exploreSummaries/new-york.ts'],
  imagePrompts: 'neighborhood-image-prompts.txt',
  events: ['src/data/events/london.ts', 'src/data/events/new-york.ts'],
  showcases: ['src/data/showcases/london.ts', 'src/data/showcases/new-york.ts'],
  imageMap: 'src/utils/neighborhoodImages.ts',
  imageAssetDir: 'src/assets/neighborhood-images',
};

// Names the multi-agent audit (CURATED_DATA_AUDIT.md) proved fabricated — never real
// places. The spot-name-fix task replaces these; the check guards against regression.
const KNOWN_FABRICATED_SPOT_NAMES = [
  'Story Coffee Wimbledon',
  'Hai Cenato at 19 Numara Bos Cirrik',
];

// ---------------------------------------------------------------------------
// Parsing (pure — same regex-record approach as scripts/generate-boundaries.js,
// which parses these exact file shapes)
// ---------------------------------------------------------------------------

// Every data file exports an array (or Record) of object literals whose records
// are indented two spaces and close with "  }," — split on that boundary.
function splitArrayRecords(source) {
  const records = [];
  const re = /^  \{\n([\s\S]*?)^  \},?\s*$/gm;
  let m;
  while ((m = re.exec(source))) records.push(m[1]);
  return records;
}

// Quoted string field, single or double quoted (double quotes appear in the data
// when a value contains an apostrophe, e.g. "St John's Wood"), honoring escaped
// quotes inside the value.
function stringField(record, name) {
  const m = record.match(
    new RegExp(`${name}:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`),
  );
  return m ? m[1].slice(1, -1).replace(/\\(.)/g, '$1') : undefined;
}

function parseNeighborhoodRecords(source) {
  return splitArrayRecords(source).map((r) => ({
    id: stringField(r, 'id'),
    name: stringField(r, 'name'),
    parentId: stringField(r, 'parentId'),
    cityId: stringField(r, 'cityId'),
  }));
}

// neighborhood-image-prompts.txt — sections headed "LONDON|NEW YORK NEIGHBORHOODS (N)"
// with per-neighborhood entries "--- N. Name ---". Returns the prompt names scoped by
// city (City of London vs NY names can collide, e.g. Chelsea) plus the counts declared
// in each section header, so stale header numbers get flagged too.
function parsePromptNames(source) {
  const byCity = { london: new Set(), 'new-york': new Set() };
  const declared = {};
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    const section = line.match(/^(LONDON|NEW YORK) NEIGHBORHOODS \((\d+)\)\s*$/);
    if (section) {
      current = section[1] === 'LONDON' ? 'london' : 'new-york';
      declared[current] = parseInt(section[2], 10);
      continue;
    }
    if (/^\s*END OF PROMPTS/.test(line)) current = null;
    if (!current) continue;
    const entry = line.match(/^---\s*\d+\.\s*(.+?)\s*---\s*$/);
    if (entry) byCity[current].add(entry[1]);
  }
  return { byCity, declared };
}

function parseSpotRecords(source) {
  return splitArrayRecords(source).map((r) => ({
    id: stringField(r, 'id'),
    neighborhoodId: stringField(r, 'neighborhoodId'),
    name: stringField(r, 'name'),
    placeId: stringField(r, 'placeId'),
  }));
}

// Spot/event/showcase records share the array-of-literals shape; community
// records additionally carry an ISO verifiedAt freshness stamp.
function parseCommunityRecords(source) {
  return splitArrayRecords(source).map((r) => ({
    id: stringField(r, 'id'),
    neighborhoodId: stringField(r, 'neighborhoodId'),
    name: stringField(r, 'name'),
    placeId: stringField(r, 'placeId'),
    verifiedAt: stringField(r, 'verifiedAt'),
  }));
}

// Record<string, { latitude, longitude }> — coordinates per neighborhood id.
function parseCoordinateMap(source) {
  const map = {};
  const re = /'([^']+)':\s*\{\s*latitude:\s*([\d.eE+-]+),\s*longitude:\s*([\d.eE+-]+)/g;
  let m;
  while ((m = re.exec(source))) map[m[1]] = { latitude: +m[2], longitude: +m[3] };
  return map;
}

// Record<string, Point[]> — one polygon per neighborhood id.
function parseBoundaryMap(source) {
  const map = {};
  const re = /'([^']+)':\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = re.exec(source))) {
    const points = [];
    const pr = /\{\s*latitude:\s*([\d.eE+-]+),\s*longitude:\s*([\d.eE+-]+)/g;
    let p;
    while ((p = pr.exec(m[2]))) points.push({ latitude: +p[1], longitude: +p[2] });
    map[m[1]] = points;
  }
  return map;
}

// Record<string, ExploreSummary> — which ids have a summary entry.
function parseSummaryKeys(source) {
  const keys = [];
  const re = /^  '([^']+)':\s*\{/gm;
  let m;
  while ((m = re.exec(source))) keys.push(m[1]);
  return keys;
}

// Record<string, string> mapping neighborhood id -> image asset name (double-quoted).
function parseImageMap(source) {
  const map = {};
  const re = /"([^"]+)":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(source))) map[m[1]] = m[2];
  return map;
}

// A valid ring: at least 3 distinct vertices, and the first point closes back
// on the last.
function ringDefect(points) {
  const unique = new Set(points.map((p) => `${p.latitude},${p.longitude}`));
  if (unique.size < 3) return 'fewer than 3 unique vertices';
  const first = points[0];
  const last = points[points.length - 1];
  if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
    return 'not a closed ring (first != last vertex)';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Checks (pure — each returns Finding[]; findings name offending ids)
// ---------------------------------------------------------------------------

// Check context: parsed cross-file data shared by all checks.
// { neighborhoods, spots, coordinates, boundaries, summaries, imageNames }
// An image "reference" = an entry in the generated id->name map whose .webp
// asset exists on disk. Neighborhoods without either are reported as misses.
function runChecks(ctx, { strict = false } = {}) {
  const findings = [];
  const add = (check, severity, message, subject) =>
    findings.push({ check, severity, message, subject });

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  const spotsByNb = new Map();
  for (const s of ctx.spots) {
    if (!spotsByNb.has(s.neighborhoodId)) spotsByNb.set(s.neighborhoodId, []);
    spotsByNb.get(s.neighborhoodId).push(s);
  }

  for (const nb of ctx.neighborhoods) {
    const label = nb.name ? `${nb.id} (${nb.name})` : nb.id;

    if (!ctx.coordinates.has(nb.id)) {
      add('coordinates-present', 'error', `missing coordinates for ${label}`, nb.id);
    }

    const ring = ctx.boundaries.get(nb.id);
    if (!ring || ring.length === 0) {
      add('boundary-polygon', 'error', `missing boundary polygon for ${label}`, nb.id);
    } else {
      const defect = ringDefect(ring);
      if (defect) add('boundary-polygon', 'error', `invalid boundary for ${label}: ${defect}`, nb.id);
    }

    if (!spotsByNb.has(nb.id) || spotsByNb.get(nb.id).length === 0) {
      add('curated-spot-coverage', 'error', `no curated spots for ${label}`, nb.id);
    }

    if (!nb.parentId && !ctx.summaries.has(nb.id)) {
      add('explore-summary-parents', 'error', `no explore summary for parent neighborhood ${label}`, nb.id);
    }

    // Prompts file coverage — checked only when the prompts context was loaded.
    if (ctx.promptNames) {
      const city = nb.cityId;
      const names = city && ctx.promptNames.byCity[city];
      if (!names) {
        add('prompts-coverage', 'error', `no prompt section for city of neighborhood ${label}`, nb.id);
      } else if (!nb.name || !names.has(nb.name)) {
        add('prompts-coverage', 'error', `no image prompt for ${label}`, nb.id);
      }
    }

    if (!ctx.imageNames.has(nb.id)) {
      add('hero-image', 'error', `no hero image reference for ${label}`, nb.id);
    }
  }

  // Header counts in the prompts file must match the entries actually parsed.
  if (ctx.promptNames) {
    for (const [city, declaredCount] of Object.entries(ctx.promptNames.declared)) {
      const actual = ctx.promptNames.byCity[city].size;
      if (declaredCount !== undefined && declaredCount !== actual) {
        add(
          'prompts-coverage',
          'warning',
          `prompts file header for ${city} declares ${declaredCount} entries but ${actual} were parsed`,
          city,
        );
      }
    }
  }

  // Cross-file spot integrity
  const nbIds = new Set(ctx.neighborhoods.map((n) => n.id));
  const seenSpotIds = new Map();
  for (const s of ctx.spots) {
    const label = `${s.id}${s.name ? ` (${s.name})` : ''}`;
    if (seenSpotIds.has(s.id)) {
      add('spot-ids-unique', 'error', `duplicate spot id ${label}`, s.id);
    } else {
      seenSpotIds.set(s.id, s.id);
    }
    if (!nbIds.has(s.neighborhoodId)) {
      add('spot-neighborhood-resolves', 'error', `spot ${label} references unknown neighborhoodId '${s.neighborhoodId}'`, s.id);
    }
  }

  // Anti-fabrication rule: every spot carries a google placeId. Warning until the
  // backfill lands (--strict promotes it to a per-spot error) — warn mode aggregates
  // so ~993 missing ids don't bury the report.
  const missingPlaceIds = ctx.spots.filter((s) => !s.placeId);
  if (missingPlaceIds.length) {
    if (strict) {
      for (const s of missingPlaceIds) {
        const label = `${s.id}${s.name ? ` (${s.name})` : ''}`;
        add('spot-place-id', 'error', `spot ${label} has no google placeId`, s.id);
      }
    } else {
      add(
        'spot-place-id',
        'warning',
        `${missingPlaceIds.length}/${ctx.spots.length} spots have no google placeId (anti-fabrication rule; backfill in progress — run --strict to list them)`,
      );
    }
  }

  // Community content: events and business showcases (src/data/events/,
  // src/data/showcases/). Empty datasets pass trivially — the checks guard
  // records once they exist.
  const nbIdSet = new Set(ctx.neighborhoods.map((n) => n.id));
  const checkCommunity = (records, kind) => {
    const seen = new Map();
    for (const r of records) {
      const label = `${r.id}${r.name ? ` (${r.name})` : ''}`;
      if (seen.has(r.id)) {
        add(`${kind}-ids-unique`, 'error', `duplicate ${kind} id ${label}`, r.id);
      } else {
        seen.set(r.id, r.id);
      }
      if (!nbIdSet.has(r.neighborhoodId)) {
        add(`${kind}-neighborhood-resolves`, 'error', `${kind} ${label} references unknown neighborhoodId '${r.neighborhoodId}'`, r.id);
      }
      if (!r.verifiedAt || !ISO_DATE.test(r.verifiedAt)) {
        add(`${kind}-verified-at`, 'error', `${kind} ${label} has no verifiedAt ISO date — required freshness signal`, r.id);
      }
      if (kind === 'showcase' && !r.placeId) {
        add('showcase-place-id', 'error', `showcase ${label} has no google placeId — anti-fabrication rule (showcases must anchor to a real place)`, r.id);
      }
    }
  };
  checkCommunity(ctx.events ?? [], 'event');
  checkCommunity(ctx.showcases ?? [], 'showcase');

  // Known-fabricated names must never re-enter the dataset.
  for (const s of ctx.spots) {
    if (KNOWN_FABRICATED_SPOT_NAMES.includes(s.name)) {
      add('spot-fabricated-name', 'error', `fabricated spot name '${s.name}' (spot ${s.id}) — replace with a verified real place`, s.id);
    }
  }

  return findings;
}

// Per-check registry — the extension point. Later tasks (events, showcases,
// regenerated summaries/images) append checks here without touching the runner.
const CHECKS = [
  { name: 'coordinates-present', description: 'every neighborhood has coordinates' },
  { name: 'boundary-polygon', description: 'closed ring, >= 3 unique vertices' },
  { name: 'curated-spot-coverage', description: 'at least one curated spot' },
  { name: 'explore-summary-parents', description: 'every parent neighborhood has an explore summary' },
  { name: 'hero-image', description: 'hero image reference for every neighborhood' },
  { name: 'prompts-coverage', description: 'every neighborhood has an image prompt' },
  { name: 'spot-ids-unique', description: 'curated spot ids are unique' },
  { name: 'spot-neighborhood-resolves', description: 'every spot neighborhoodId resolves' },
  { name: 'spot-place-id', description: 'every spot carries a google placeId' },
  { name: 'spot-fabricated-name', description: 'no known-fabricated spot names' },
  { name: 'event-ids-unique', description: 'event ids are unique' },
  { name: 'event-neighborhood-resolves', description: 'every event neighborhoodId resolves' },
  { name: 'event-verified-at', description: 'every event carries an ISO verifiedAt date' },
  { name: 'showcase-ids-unique', description: 'showcase ids are unique' },
  { name: 'showcase-neighborhood-resolves', description: 'every showcase neighborhoodId resolves' },
  { name: 'showcase-verified-at', description: 'every showcase carries an ISO verifiedAt date' },
  { name: 'showcase-place-id', description: 'every showcase carries a google placeId' },
];

// ---------------------------------------------------------------------------
// I/O edge
// ---------------------------------------------------------------------------

function readRepoFile(relPath) {
  return fs.readFileSync(relPath, 'utf8');
}

function loadContext() {
  const imageNames = new Set();
  if (fs.existsSync(DATA_FILES.imageAssetDir)) {
    for (const f of fs.readdirSync(DATA_FILES.imageAssetDir)) {
      imageNames.add(f.replace(/\.(webp|png|jpe?g)$/i, ''));
    }
  }
  return imageNames;
}

function main() {
  const strict = process.argv.includes('--strict');
  const imageNames = loadContext();

  const neighborhoods = DATA_FILES.neighborhoods.flatMap((f) => parseNeighborhoodRecords(readRepoFile(f)));
  const spots = DATA_FILES.spots.flatMap((f) => parseSpotRecords(readRepoFile(f)));
  const events = DATA_FILES.events.flatMap((f) => parseCommunityRecords(readRepoFile(f)));
  const showcases = DATA_FILES.showcases.flatMap((f) => parseCommunityRecords(readRepoFile(f)));
  const coordinates = new Map(
    DATA_FILES.coordinates.flatMap((f) => Object.entries(parseCoordinateMap(readRepoFile(f)))),
  );
  const boundaries = new Map(
    DATA_FILES.boundaries.flatMap((f) => Object.entries(parseBoundaryMap(readRepoFile(f)))),
  );
  const summaries = new Set(DATA_FILES.exploreSummaries.flatMap((f) => parseSummaryKeys(readRepoFile(f))));
  const promptNames = parsePromptNames(readRepoFile(DATA_FILES.imagePrompts));
  const imageMap = parseImageMap(readRepoFile(DATA_FILES.imageMap));
  // An image reference counts only when the asset file exists on disk next to it.
  const coveredImages = new Set(
    Object.entries(imageMap).filter(([, name]) => imageNames.has(name)).map(([id]) => id),
  );

  const findings = runChecks(
    { neighborhoods, spots, coordinates, boundaries, summaries, promptNames, imageNames: coveredImages, events, showcases },
    { strict },
  );

  console.log(`validate-data: ${neighborhoods.length} neighborhoods, ${spots.length} curated spots, ${events.length} events, ${showcases.length} showcases\n`);
  let exit = 0;
  for (const check of CHECKS) {
    const rows = findings.filter((f) => f.check === check.name);
    const hasErr = rows.some((f) => f.severity === 'error');
    const mark = hasErr ? 'FAIL' : rows.length ? 'WARN' : 'ok  ';
    console.log(`[${mark}] ${check.name} — ${check.description}`);
    for (const f of rows) {
      console.log(`       ${f.severity === 'error' ? '✗' : '⚠'} ${f.message}`);
      if (f.severity === 'error') exit = 1;
    }
    if (!rows.length) console.log('       all pass');
  }

  if (exit) console.log('\nvalidate-data: FAILED (errors above name the offending ids)');
  else console.log('\nvalidate-data: PASSED');
  process.exitCode = exit;
}

if (require.main === module) main();

module.exports = {
  DATA_FILES,
  KNOWN_FABRICATED_SPOT_NAMES,
  CHECKS,
  splitArrayRecords,
  stringField,
  parseNeighborhoodRecords,
  parseSpotRecords,
  parseCommunityRecords,
  parsePromptNames,
  parseCoordinateMap,
  parseBoundaryMap,
  parseSummaryKeys,
  parseImageMap,
  ringDefect,
  runChecks,
};
