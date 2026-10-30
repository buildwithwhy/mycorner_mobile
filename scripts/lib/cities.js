/*
 * Per-city configuration for the boundary pipeline (generate / fetch-water / preview / check).
 *
 * London's entries are frozen: its generated boundaries must stay byte-identical across
 * refactors (regression guard = regenerate London and diff), so only touch london values
 * with a proven-identical regeneration.
 *
 * Field guide:
 *   spotsFile / coordinatesFile / neighborhoodsFile — bundled data the pipeline reads
 *   boundariesFile / outputVar                      — generated TS module and its export name
 *   waterFile / waterLabel                          — cached OSM water rings used for land clipping
 *   lat0                                            — equirectangular reference latitude (x = lng * cos(lat0))
 *   overpassBbox / minWaterAreaKm2                  — water-cache query area (south,west,north,east) and the
 *                                                     smallest polygon kept (drops ponds, keeps rivers/docks)
 *   preview                                         — Leaflet initial view for preview-boundaries.js
 *   orphanTargets — neighborhoods that own orphaned across-water strips inside a lat/lng box
 *                     (London: Fulham's Bishops Park / Hurlingham riverside strips)
 *   reassignToNearestCenter — nearest-center spot reassignment with a 150 m hysteresis (a
 *                     London-era data-repair heuristic that never settles on dense cities);
 *                     false = only the final containment pass reassigns spots (idempotent)
 *   region        — optional [south,west,north,east] clamp on the Voronoi extent (null = derive
 *                     from neighborhood sites only, the historical behavior)
 */

// --city=<id> or --city <id> from argv; falls back to <fallback> (the historical default).
function pickCity(argv = process.argv, fallback = "london") {
  const i = argv.findIndex(a => a === "--city" || a.startsWith("--city="));
  if (i < 0) return fallback;
  const v = argv[i].startsWith("--city=") ? argv[i].slice(7) : argv[i + 1];
  if (!v || v.startsWith("--")) { console.error("--city needs a value"); process.exit(1); }
  return v;
}
function cityById(id) {
  const c = CITIES[id];
  if (!c) { console.error(`unknown city '${id}' (known: ${Object.keys(CITIES).join(", ")})`); process.exit(1); }
  return c;
}

const CITIES = {
  london: {
    id: "london",
    label: "London",
    spotsFile: "src/data/curatedSpots/london.ts",
    coordinatesFile: "src/data/coordinates/london.ts",
    neighborhoodsFile: "src/data/neighborhoods/london.ts",
    boundariesFile: "src/data/boundaries/london.ts",
    outputVar: "londonBoundaries",
    waterFile: "scripts/data/thames-water.json",
    waterLabel: "Thames",
    lat0: 51.5,
    overpassBbox: "51.42,-0.32,51.60,0.10",
    minWaterAreaKm2: 0.08,
    preview: { center: [51.505, -0.06], zoom: 12 },
    orphanTargets: [{ nb: "27", latMin: 51.46, latMax: 51.485, lngMin: -0.225, lngMax: -0.185 }],
    reassignToNearestCenter: true,
    region: null,
  },
  "new-york": {
    id: "new-york",
    label: "New York",
    spotsFile: "src/data/curatedSpots/new-york.ts",
    coordinatesFile: "src/data/coordinates/new-york.ts",
    neighborhoodsFile: "src/data/neighborhoods/new-york.ts",
    boundariesFile: "src/data/boundaries/new-york.ts",
    outputVar: "newYorkBoundaries",
    waterFile: "scripts/data/new-york-water.json",
    waterLabel: "Hudson / East River",
    lat0: 40.72,
    overpassBbox: "40.45,-74.30,40.95,-73.70",
    minWaterAreaKm2: 0.08,
    preview: { center: [40.742, -73.96], zoom: 11 },
    orphanTargets: [],
    reassignToNearestCenter: false,
    region: [40.45, -74.30, 40.95, -73.70],
  },
};

module.exports = { ...CITIES }; // copy — helpers below must not leak into the city lookup
module.exports.pickCity = pickCity;
module.exports.cityById = cityById;
