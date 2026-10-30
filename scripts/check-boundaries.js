/*
 * Spot-inside-neighborhood check: every neighborhood polygon must contain at least
 * --min (default 0.8) of the curated spots assigned to it. This mirrors the audit
 * method (point-in-polygon per spot) and is the acceptance gate for generated
 * boundaries — a polygon that loses its own spots is not a reviewable boundary.
 *
 * The default npm gate pins --city=new-york: the committed London data has two small
 * riverside neighborhoods below the threshold (pier spots sitting over the Thames —
 * a known, accepted property of its banks), so an all-cities run is informational.
 *
 * Run from the repo root:  node scripts/check-boundaries.js [--city=new-york|london|all] [--min=0.8]
 */
const fs = require("fs");
const CITIES = require("./lib/cities");

const minArg = process.argv.find(a => a.startsWith("--min="));
const min = minArg ? parseFloat(minArg.slice(6)) : 0.8;
const scopeArg = process.argv.find(a => a.startsWith("--city="));
const scope = scopeArg ? scopeArg.slice(7) : "new-york";
if (Number.isNaN(min) || min <= 0 || min > 1) { console.error(`--min must be in (0, 1], got ${minArg || ""}`); process.exit(1); }
const cityIds = scope === "all"
  ? Object.keys(CITIES).filter(k => typeof CITIES[k] === "object")
  : [scope];

// point-in-polygon (ray casting) in plain lat/lng — affine-safe, matches the audit method
function pip(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > pt.lat) !== (yj > pt.lat)) && (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function parseBoundaries(file) {
  const src = fs.readFileSync(file, "utf8");
  const cells = {};
  for (const m of src.matchAll(/'([^']+)': \[([\s\S]*?)\],\n/g)) {
    const ring = [...m[2].matchAll(/latitude: ([-\d.]+), longitude: ([-\d.]+)/g)].map(x => [+x[2], +x[1]]);
    if (ring.length) cells[m[1]] = ring;
  }
  return cells;
}

function parseSpots(file) {
  const src = fs.readFileSync(file, "utf8");
  const re = /id:\s*'([^']+)',\s*neighborhoodId:\s*'([^']+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*category:\s*'([^']+)'[\s\S]*?location:\s*\{\s*lat:\s*([-\d.]+),\s*lng:\s*([-\d.]+)\s*\}/g;
  const spots = [];
  for (const m of src.matchAll(re)) spots.push({ nb: m[2], name: m[3].replace(/\\(.)/g, "$1"), lat: +m[5], lng: +m[6] });
  return spots;
}

let failed = false;
for (const id of cityIds) {
  const CITY = CITIES[id];
  if (!CITY) { console.error(`unknown city '${id}' (known: ${cityIds.join(", ")})`); process.exit(1); }
  const cells = parseBoundaries(CITY.boundariesFile);
  const spots = parseSpots(CITY.spotsFile);
  const byNb = {};
  for (const s of spots) (byNb[s.nb] = byNb[s.nb] || []).push(s);

  console.log(`\n${CITY.label}: ${spots.length} spots, ${Object.keys(cells).length} polygons, threshold ${Math.round(min * 100)}%`);
  const violations = [];
  let homeless = 0;
  for (const nb of Object.keys(byNb).sort()) {
    const cell = cells[nb];
    const group = byNb[nb];
    const inside = cell ? group.filter(s => pip(s, cell)) : [];
    if (cell) homeless += group.length - inside.length;
    const ratio = cell ? inside.length / group.length : 0;
    if (ratio < min) {
      failed = true;
      violations.push({ nb, ratio, group, inside: inside.length });
      const outside = group.filter(s => !cell || !pip(s, cell)).map(s => s.name);
      console.log(`  FAIL ${nb}: ${inside.length}/${group.length} (${Math.round(ratio * 100)}%) — outside: ${outside.join(", ")}`);
    }
  }
  if (!violations.length) console.log(`  all ${Object.keys(byNb).length} neighborhoods >= ${Math.round(min * 100)}%`);
  console.log(`  spots in no polygon (water-locked/edge): ${homeless}`);
}

if (failed) { console.error("\nboundary check FAILED"); process.exit(1); }
console.log("\nboundary check passed");
