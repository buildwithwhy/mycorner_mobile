/**
 * Shared pure helpers for the neighborhood-image pipeline (generation, renaming,
 * app wiring). Parsers reuse validate-data.js so the file shapes are understood
 * in exactly one place. Exported for unit testing.
 */
const {
  DATA_FILES,
  parseNeighborhoodRecords,
} = require('../validate-data.js');

// "Hell's Kitchen" -> hells-kitchen, "Elephant & Castle" -> elephant-and-castle.
// Apostrophes are dropped (never hyphenated) to match the existing asset names.
function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Punctuation-insensitive comparison key: "SoHo", "Soho" and "soho" all collapse.
// "&" expands to " and " first so "Elephant & Castle" matches "Elephant and Castle".
function normalizeForMatch(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '');
}

// neighborhood-image-prompts.txt — sections headed "LONDON|NEW YORK NEIGHBORHOODS (N)"
// with per-neighborhood entries:
//   --- 41. Canada Water ---
//   Highlights: ...
//   <prompt paragraph>
// Returns [{ cityId, name, prompt }]; "Highlights:" lines are metadata, not prompt.
function parsePromptLibrary(source) {
  const entries = [];
  let cityId = null;
  let entry = null;

  const flush = () => {
    if (entry && entry.lines.length) {
      entries.push({ cityId: entry.cityId, name: entry.name, prompt: entry.lines.join(' ').trim() });
    }
    entry = null;
  };

  for (const raw of source.split(/\r?\n/)) {
    const section = raw.match(/^(LONDON|NEW YORK) NEIGHBORHOODS \(\d+\)\s*$/);
    if (section) {
      flush();
      cityId = section[1] === 'LONDON' ? 'london' : 'new-york';
      continue;
    }
    if (/^\s*END OF PROMPTS/.test(raw)) {
      flush();
      cityId = null;
      continue;
    }
    if (!cityId) continue;

    const header = raw.match(/^---\s*\d+\.\s*(.+?)\s*---\s*$/);
    if (header) {
      flush();
      entry = { cityId, name: header[1], lines: [] };
      continue;
    }
    if (!entry) continue;
    if (/^\s*$/.test(raw)) {
      // A blank between the header/Highlights and the paragraph must not close
      // the entry — only a blank after prompt lines does.
      if (entry.lines.length) flush();
      continue;
    }
    if (/^Highlights:/i.test(raw.trim())) continue;
    entry.lines.push(raw.trim());
  }
  flush();
  return entries;
}

// All neighborhoods from the bundled data files (id, name, cityId).
function loadNeighborhoods(readFileSync) {
  const records = [];
  for (const rel of DATA_FILES.neighborhoods) {
    records.push(...parseNeighborhoodRecords(readFileSync(rel, 'utf8')));
  }
  return records;
}

// Asset basenames (e.g. "soho" from soho.webp) present on disk.
function loadExistingAssets(existsSync, readdirSync, assetDir) {
  if (!existsSync(assetDir)) return new Set();
  return new Set(
    readdirSync(assetDir)
      .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
      .map((f) => f.replace(/\.(webp|png|jpe?g)$/i, '')),
  );
}

// id -> asset basename for every neighborhood. Colliding slugs (Soho and Chelsea
// exist in both cities) keep the bare name for whichever neighborhood the
// committed wiring map already assigns it to; the others are suffixed with
// their city id (soho-london, chelsea-new-york), so committed assets never move.
function assignAssetNames(neighborhoods, currentImageMap = {}) {
  const bySlug = new Map();
  for (const nb of neighborhoods) {
    const slug = slugifyName(nb.name);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(nb);
  }

  const names = new Map();
  for (const [slug, group] of bySlug) {
    if (group.length === 1) {
      names.set(group[0].id, slug);
      continue;
    }
    const owner = group.find((nb) => currentImageMap[nb.id] === slug);
    for (const nb of group) {
      const bare = owner && nb.id === owner.id;
      names.set(nb.id, bare ? slug : `${slug}-${nb.cityId}`);
    }
  }
  return names;
}

module.exports = {
  slugifyName,
  normalizeForMatch,
  parsePromptLibrary,
  loadNeighborhoods,
  loadExistingAssets,
  assignAssetNames,
};
