/*
 * Renders the current London boundaries (src/data/boundaries/london.ts) on a Leaflet map
 * for visual review. Writes scripts/.cache/boundaries-map.html and opens it.
 *
 * Run from the repo root:  node scripts/preview-boundaries.js   (or: npm run boundaries:preview)
 */
const fs = require("fs"), { execSync } = require("child_process");

const b = fs.readFileSync("src/data/boundaries/london.ts", "utf8");
const features = [];
for (const m of b.matchAll(/'([0-9]+)': \[([\s\S]*?)\],\n/g)) {
  const ring = [...m[2].matchAll(/latitude: ([-\d.]+), longitude: ([-\d.]+)/g)].map(x => [+x[2], +x[1]]);
  if (ring.length) { ring.push(ring[0]); features.push({ type: "Feature", properties: { id: m[1] }, geometry: { type: "Polygon", coordinates: [ring] } }); }
}
const ns = fs.readFileSync("src/data/neighborhoods/london.ts", "utf8");
const names = {};
for (const p of ns.split(/\n  \{/)) { const id = (p.match(/id:\s*'([0-9]+)'/) || [])[1]; const name = (p.match(/name:\s*'((?:[^'\\]|\\.)*)'/) || [])[1]; if (id && name) names[id] = name.replace(/\\'/g, "'"); }
for (const f of features) f.properties.name = names[f.properties.id] || f.properties.id;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>MyCorner boundaries</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const data = ${JSON.stringify({ type: "FeatureCollection", features })};
const map = L.map('map').setView([51.505,-0.06], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
const layer = L.geoJSON(data,{ style:()=>({color:'#5D8A8A',weight:1,fillColor:'#5D8A8A',fillOpacity:0.08}),
  onEachFeature:(f,l)=>{ l.bindTooltip(f.properties.name+' ('+f.properties.id+')',{sticky:true});
    L.marker(l.getBounds().getCenter(),{icon:L.divIcon({className:'',html:'<div style="font:11px sans-serif;color:#111;text-shadow:0 0 3px #fff,0 0 3px #fff">'+f.properties.name+'</div>'})}).addTo(map);}
}).addTo(map); map.fitBounds(layer.getBounds());
</script></body></html>`;
fs.mkdirSync("scripts/.cache", { recursive: true });
const out = "scripts/.cache/boundaries-map.html";
fs.writeFileSync(out, html);
console.log("wrote " + out);
try { execSync(`open ${out}`); } catch (e) { console.log("open it manually: " + out); }
