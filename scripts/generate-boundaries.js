/*
 * Regenerates London neighborhood boundaries (src/data/boundaries/london.ts).
 *
 * Pipeline: Voronoi tessellation of each neighborhood's robust spot centroid ->
 * clip to LAND by subtracting the OSM Thames water polygon (scripts/data/thames-water.json)
 * and keeping the component containing the center -> re-attach orphaned across-river strips
 * to the nearest same-bank neighborhood -> Douglas-Peucker simplify. It ALSO reassigns each
 * curated spot to the cell that geometrically contains it (point-in-polygon).
 *
 * Run from the repo root:  node scripts/generate-boundaries.js   (or: npm run boundaries)
 * Refresh the water cache:  node scripts/fetch-thames-water.js
 * Preview on a map:         node scripts/preview-boundaries.js
 *
 * Build-time only — the app bundles the static output, not this script or polygon-clipping.
 */
const fs = require("fs");
const SPOTF = "src/data/curatedSpots/london.ts";
const K = Math.cos(51.5 * Math.PI / 180);
const toXY = p => ({ x: p.lng * K, y: p.lat });
const toLL = p => ({ lng: p.x / K, lat: p.y });
function hav(a, b) { const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
const median = a => { a = [...a].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };

// declared centers
function declared(file) { const s = fs.readFileSync(file, "utf8"); const map = {}; const re = /'([0-9]+)':\s*\{\s*latitude:\s*([-\d.]+),\s*longitude:\s*([-\d.]+)\s*\}/g; let m; while ((m = re.exec(s))) map[m[1]] = { lat: +m[2], lng: +m[3] }; return map; }
const DC = declared("src/data/coordinates/london.ts");
const ALL_NB = Object.keys(DC);

// parse spots with id, nb, cat, coords
const src0 = fs.readFileSync(SPOTF, "utf8");
const re = /id:\s*'([^']+)',\s*neighborhoodId:\s*'([0-9]+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*category:\s*'([^']+)'[\s\S]*?location:\s*\{\s*lat:\s*([-\d.]+),\s*lng:\s*([-\d.]+)\s*\}/g;
let m, spots = [];
while ((m = re.exec(src0))) spots.push({ id: m[1], nb: m[2], name: m[3].replace(/\\(.)/g, "$1"), cat: m[4], lat: +m[5], lng: +m[6] });

function centersFrom(spots) {
  const by = {}; for (const s of spots) (by[s.nb] = by[s.nb] || []).push(s);
  const c = {};
  for (const nb of ALL_NB) {
    const pts = by[nb] || [];
    c[nb] = pts.length >= 3 ? { lat: median(pts.map(p => p.lat)), lng: median(pts.map(p => p.lng)) } : DC[nb];
  }
  return c;
}
function nearestNb(p, centers) { let best = null; for (const nb of ALL_NB) { const d = hav(p, centers[nb]); if (!best || d < best.d) best = { nb, d }; } return best; }

// 1) iterative nearest-center reassignment (your "spots must fit inside" rule) so every
//    spot sits in its nearest cell; with central neighborhoods now present, central spots
//    stuck in far neighborhoods come home.
for (const s of spots) s.orig = s.nb;
let centers = centersFrom(spots);
for (let iter = 0; iter < 6; iter++) {
  let changed = 0;
  for (const s of spots) {
    const nr = nearestNb(s, centers);
    if (nr.nb !== s.nb && nr.d < hav(s, centers[s.nb]) - 0.15) { s.nb = nr.nb; changed++; }
  }
  centers = centersFrom(spots);
  if (!changed) break;
}
// (reassigned computed after the final point-in-polygon pass below)

// 2) Voronoi sites
const sites = {};
for (const nb of ALL_NB) sites[nb] = centers[nb];
const S = ALL_NB.map(nb => ({ nb, ...toXY(sites[nb]) }));

// bbox
let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
for (const s of S) { minx = Math.min(minx, s.x); maxx = Math.max(maxx, s.x); miny = Math.min(miny, s.y); maxy = Math.max(maxy, s.y); }
const mx = (maxx - minx) * 0.08 + 0.02, my = (maxy - miny) * 0.08 + 0.02;
minx -= mx; maxx += mx; miny -= my; maxy += my;
const bbox = [{ x: minx, y: miny }, { x: maxx, y: miny }, { x: maxx, y: maxy }, { x: minx, y: maxy }];

function clipHalf(poly, nx, ny, px, py) { // keep side where (P-p)·n >= 0
  const f = P => (P.x - px) * nx + (P.y - py) * ny;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const dc = f(cur), dp = f(prev);
    if (dc >= 0) { if (dp < 0) { const t = dp / (dp - dc); out.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) }); } out.push(cur); }
    else if (dp >= 0) { const t = dp / (dp - dc); out.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) }); }
  }
  return out;
}

// pure Voronoi cells (may cross the river), then clip to LAND by subtracting the Thames
// water polygon and keeping the component that contains the neighborhood's center.
const pc = require("polygon-clipping");
const water = JSON.parse(fs.readFileSync("scripts/data/thames-water.json", "utf8")).map(r => [r]); // each a Polygon
function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[i][0] * r[j][1] - r[j][0] * r[i][1]; return Math.abs(a / 2); }
function pipLL(x, y, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }

const cells = {};
for (const a of S) {
  let poly = bbox.slice();
  for (const b of S) { if (b.nb === a.nb) continue; const mxp = (a.x + b.x) / 2, myp = (a.y + b.y) / 2; poly = clipHalf(poly, a.x - b.x, a.y - b.y, mxp, myp); if (poly.length < 3) break; }
  cells[a.nb] = poly;
}
function ringAreaKm2(r) { const k = Math.cos(51.5 * Math.PI / 180); let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[i][0] * 111.32 * k) * (r[j][1] * 110.57) - (r[j][0] * 111.32 * k) * (r[i][1] * 110.57); return Math.abs(a / 2); }
function ringCentroid(r) { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; }
function crossesWater(a, b) { for (let t = 0.04; t < 1; t += 0.04) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; for (const w of water) if (pipLL(x, y, w[0])) return true; } return false; }

const orphans = [];
for (const nb of ALL_NB) {
  let poly = cells[nb]; if (!poly || poly.length < 3) continue;
  let ring = poly.map(toLL).map(p => [p.lng, p.lat]); ring.push(ring[0]);
  let res; try { res = pc.difference([ring], ...water); } catch (e) { res = null; }
  if (!res || !res.length) continue;            // no water intersected -> keep as-is
  const cen = sites[nb];
  const outers = res.map(p => p[0]);
  let containing = outers.filter(r => pipLL(cen.lng, cen.lat, r)).sort((a, b) => ringArea(b) - ringArea(a));
  const main = containing.length ? containing[0] : outers.slice().sort((a, b) => ringArea(b) - ringArea(a))[0];
  cells[nb] = main.map(([lng, lat]) => toXY({ lng, lat }));
  for (const r of outers) if (r !== main && ringAreaKm2(r) > 0.03) orphans.push(r);  // across-bank land, don't drop it
}
// re-attach each orphan to the nearest neighborhood reachable on the same bank (no water crossing)
for (const orph of orphans) {
  const c = ringCentroid(orph);
  let target = null, bd = Infinity;
  for (const nb of ALL_NB) {
    const cc = sites[nb]; if (!cells[nb] || crossesWater(c, [cc.lng, cc.lat])) continue;  // same bank only
    let md = Infinity; for (const v of cells[nb]) { const ll = toLL(v); const d = (ll.lng - c[0]) ** 2 + (ll.lat - c[1]) ** 2; if (d < md) md = d; }  // nearest cell edge
    if (md < bd) { bd = md; target = nb; }
  }
  // explicit: Fulham (27) owns its riverside strips (Bishops Park / Hurlingham)
  if (c[1] > 51.46 && c[1] < 51.485 && c[0] > -0.225 && c[0] < -0.185 && cells["27"] && !crossesWater(c, [sites["27"].lng, sites["27"].lat])) target = "27";
  if (!target || !cells[target]) continue;
  const tRing = cells[target].map(toLL).map(p => [p.lng, p.lat]); tRing.push(tRing[0]);
  let u; try { u = pc.union([tRing], [orph]); } catch (e) { u = null; }
  if (u && u.length) { const o2 = u.map(p => p[0]).sort((a, b) => ringArea(b) - ringArea(a)); cells[target] = o2[0].map(([lng, lat]) => toXY({ lng, lat })); }
}

// 3) validate: each spot inside its cell
function pip(pt, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y; if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
let outVenue = 0, outBig = 0, outNames = [];
for (const s of spots) { const cell = cells[s.nb]; if (!cell || cell.length < 3) continue; if (!pip(toXY(s), cell)) { if (["park", "landmark", "market"].includes(s.cat)) outBig++; else { outVenue++; if (outNames.length < 15) outNames.push(`${s.name}[${s.nb}]`); } } }

// simplify (Douglas-Peucker) to drop redundant bank vertices
function perp(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-12; const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2; return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); }
function dp(pts, eps) { if (pts.length < 4) return pts; const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true; const st = [[0, pts.length - 1]]; while (st.length) { const [s, e] = st.pop(); let dmax = 0, idx = -1; for (let i = s + 1; i < e; i++) { const d = perp(pts[i], pts[s], pts[e]); if (d > dmax) { dmax = d; idx = i; } } if (idx > -1 && dmax > eps) { keep[idx] = true; st.push([s, idx], [idx, e]); } } return pts.filter((_, i) => keep[i]); }

// 4) write boundaries + geojson
let out = "// Neighborhood boundaries: Voronoi of robust spot centroids, clipped to LAND against\n// the OSM Thames water polygon (cells sit inside the river banks, no crossing).\n";
out += "export const londonBoundaries: Record<string, { latitude: number; longitude: number }[]> = {\n";
for (const nb of ALL_NB) { if (!cells[nb] || cells[nb].length < 3) continue; const simp = dp(cells[nb], 0.00035); const ring = simp.map(toLL).map(p => `    { latitude: ${p.lat.toFixed(5)}, longitude: ${p.lng.toFixed(5)} }`); out += `  '${nb}': [\n${ring.join(",\n")},\n  ],\n`; cells[nb] = simp; }
out += "};\n";
fs.writeFileSync("src/data/boundaries/london.ts", out);

// final point-in-polygon pass: assign every spot to the cell that actually contains it
for (const s of spots) {
  if (cells[s.nb] && cells[s.nb].length >= 3 && pip(toXY(s), cells[s.nb])) continue;
  for (const nb of ALL_NB) { if (nb === s.nb) continue; const c = cells[nb]; if (c && c.length >= 3 && pip(toXY(s), c)) { s.nb = nb; break; } }
}
const reassigned = spots.filter(s => s.nb !== s.orig).map(s => ({ id: s.id, name: s.name, from: s.orig, to: s.nb }));
outVenue = 0; outBig = 0; outNames = [];
for (const s of spots) { const cell = cells[s.nb]; if (!cell || cell.length < 3) continue; if (!pip(toXY(s), cell)) { if (["park", "landmark", "market"].includes(s.cat)) outBig++; else { outVenue++; if (outNames.length < 15) outNames.push(`${s.name}[${s.nb}]`); } } }

// 5) apply reassignments to the spots file
let src = src0;
function findBlock(src, id) { const idx = src.indexOf(`id: '${id}'`); if (idx < 0) return null; const open = src.lastIndexOf("{", idx); let d = 0, close = -1; for (let i = open; i < src.length; i++) { const c = src[i]; if (c === "{") d++; else if (c === "}") { d--; if (d === 0) { close = i; break; } } } return close < 0 ? null : { open, close }; }
for (const r of reassigned) { const b = findBlock(src, r.id); if (!b) continue; const block = src.slice(b.open, b.close); const nb = block.replace(/neighborhoodId:\s*'[^']+'/, `neighborhoodId: '${r.to}'`); src = src.slice(0, b.open) + nb + src.slice(b.close); }
fs.writeFileSync(SPOTF, src);

console.log("reassigned spots:", reassigned.length);
reassigned.forEach(r => console.log(`  ${r.name}: ${r.from} -> ${r.to}`));
console.log("venues outside cell:", outVenue, "| big features outside:", outBig, outNames.length?"("+outNames.join(", ")+")":"");
