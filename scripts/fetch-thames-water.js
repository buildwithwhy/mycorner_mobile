/*
 * Refreshes the cached OSM water polygon for a city (scripts/data/<city>-water.json —
 * London: thames-water.json), used by generate-boundaries.js to clip neighborhood cells
 * to land. The cache is committed, so regeneration is deterministic between fetches.
 *
 * Run from the repo root:  node scripts/fetch-thames-water.js [--city=london|new-york]
 */
const https = require("https"), fs = require("fs");
const { pickCity, cityById } = require("./lib/cities");
const CITY = cityById(pickCity());
const q = `[out:json][timeout:120];
(
  way["natural"="water"](${CITY.overpassBbox});
  rel["natural"="water"](${CITY.overpassBbox});
);
out geom;`;
https.get("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q), { headers: { "User-Agent": "mycorner-boundaries/1.0" } }, r => {
  let d = ""; r.on("data", c => d += c); r.on("end", () => {
    const j = JSON.parse(d);
    const k = Math.cos(CITY.lat0 * Math.PI / 180);
    const area = ring => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[i][0] * k * 111.32) * (ring[j][1] * 110.57) - (ring[j][0] * k * 111.32) * (ring[i][1] * 110.57); return Math.abs(a / 2); };
    const eq = (p, q) => Math.abs(p[0] - q[0]) < 1e-7 && Math.abs(p[1] - q[1]) < 1e-7;
    const polys = [];
    for (const e of j.elements || []) {
      if (e.type === "way" && e.geometry) {
        const ring = e.geometry.map(g => [g.lon, g.lat]);
        if (ring.length > 3 && eq(ring[0], ring[ring.length - 1])) polys.push(ring);
      } else if (e.type === "relation") {
        let segs = (e.members || []).filter(m => m.role === "outer" && m.geometry).map(m => m.geometry.map(g => [g.lon, g.lat]));
        while (segs.length) { let cur = segs.shift().slice(), changed = true; while (changed) { changed = false; for (let i = 0; i < segs.length; i++) { const s = segs[i], e1 = cur[cur.length - 1]; if (eq(e1, s[0])) { cur = cur.concat(s.slice(1)); segs.splice(i, 1); changed = true; break; } if (eq(e1, s[s.length - 1])) { cur = cur.concat(s.slice().reverse().slice(1)); segs.splice(i, 1); changed = true; break; } } } if (cur.length > 3) polys.push(cur); }
      }
    }
    const big = polys.filter(p => area(p) > CITY.minWaterAreaKm2); // keep rivers + major water bodies, drop small ponds
    fs.writeFileSync(CITY.waterFile, JSON.stringify(big));
    console.log(`saved ${big.length} water polygons to ${CITY.waterFile}`);
  });
}).on("error", e => console.log("ERR", e.message));
