#!/usr/bin/env node

/**
 * Neighborhood Image Wiring
 *
 * 1. Renames legacy ID-based image files (1.png, ny-1.png, ...) to the
 *    human-readable asset names derived from neighborhood data.
 * 2. Regenerates the app wiring files:
 *      - src/utils/neighborhoodImages.ts   (id -> asset name map)
 *      - src/assets/neighborhood-images/index.ts (static requires + id map)
 *
 * Coverage is derived from src/data/neighborhoods/ — nothing is hardcoded here.
 *
 * Usage: node scripts/rename-neighborhood-images.js
 */

const fs = require('fs');
const path = require('path');
const {
  loadNeighborhoods,
  loadExistingAssets,
  assignAssetNames,
} = require('./lib/neighborhood-image-lib.js');
const { parseImageMap } = require('./validate-data.js');

const REPO_ROOT = path.join(__dirname, '..');
const IMAGE_DIR = path.join(REPO_ROOT, 'src/assets/neighborhood-images');
const UTIL_MAP_PATH = path.join(REPO_ROOT, 'src/utils/neighborhoodImages.ts');
const INDEX_PATH = path.join(IMAGE_DIR, 'index.ts');

// camelCase TS identifier from an asset name: "notting-hill" -> nottingHill
function toIdentifier(assetName) {
  return assetName
    .split('-')
    .map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

function main() {
  if (!fs.existsSync(IMAGE_DIR)) {
    console.log('❌ Image directory does not exist:', IMAGE_DIR);
    process.exitCode = 1;
    return;
  }

  const neighborhoods = loadNeighborhoods((p) => fs.readFileSync(p, 'utf8'));
  const existingAssets = loadExistingAssets(fs.existsSync, fs.readdirSync, IMAGE_DIR);
  const currentImageMap = fs.existsSync(UTIL_MAP_PATH)
    ? parseImageMap(fs.readFileSync(UTIL_MAP_PATH, 'utf8'))
    : {};
  const assetNames = assignAssetNames(neighborhoods, currentImageMap);

  // --- 1. Rename legacy ID-named files -------------------------------------
  let renamed = 0;
  let skipped = 0;
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    if (!/\.png$/i.test(file)) continue;
    const id = file.replace(/\.png$/i, '');
    const newName = assetNames.get(id);
    if (!newName || newName === id) {
      skipped++;
      continue;
    }
    const newPath = path.join(IMAGE_DIR, `${newName}.png`);
    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Skipping ${file} -> ${newName}.png (already exists)`);
      skipped++;
      continue;
    }
    fs.renameSync(path.join(IMAGE_DIR, file), newPath);
    console.log(`✅ ${file} -> ${newName}.png`);
    renamed++;
  }
  console.log(`\nRenamed: ${renamed}, Skipped: ${skipped}`);

  // --- 2. Regenerate wiring -------------------------------------------------
  // Ordered London first, then New York, ids in data order.
  const london = neighborhoods.filter((nb) => nb.cityId === 'london');
  const newYork = neighborhoods.filter((nb) => nb.cityId === 'new-york');

  const requiresFor = (nbs) =>
    nbs
      .map((nb) => {
        const asset = assetNames.get(nb.id);
        return `const ${toIdentifier(asset)} = require('./${asset}.webp');`;
      })
      .join('\n');

  const mapEntriesFor = (nbs, comment) =>
    [
      `  // ${comment}`,
      ...nbs.map((nb) => `  '${nb.id}': ${toIdentifier(assetNames.get(nb.id))},`),
    ].join('\n');

  const indexContent = `// Auto-generated neighborhood image mappings — regenerate with:
//   node scripts/rename-neighborhood-images.js
// Maps neighborhood ID to the bundled image asset.

import { ImageSourcePropType } from 'react-native';

// London neighborhoods (IDs ${london[0]?.id} to ${london[london.length - 1]?.id})
${requiresFor(london)}

// New York neighborhoods (IDs ${newYork[0]?.id} to ${newYork[newYork.length - 1]?.id})
${requiresFor(newYork)}

// Map neighborhood ID to image
export const neighborhoodImages: Record<string, ImageSourcePropType> = {
${mapEntriesFor(london, `London (IDs ${london[0]?.id} to ${london[london.length - 1]?.id})`)},

${mapEntriesFor(newYork, `New York (IDs ${newYork[0]?.id} to ${newYork[newYork.length - 1]?.id})`)},
};

export const getNeighborhoodImage = (id: string): ImageSourcePropType | undefined => {
  return neighborhoodImages[id];
};
`;
  fs.writeFileSync(INDEX_PATH, indexContent);
  console.log(`📝 Regenerated: ${path.relative(REPO_ROOT, INDEX_PATH)}`);

  const utilMapContent = `// Auto-generated mapping of neighborhood IDs to image asset names
// Run: node scripts/rename-neighborhood-images.js

export const neighborhoodImageMap: Record<string, string> = ${JSON.stringify(
    Object.fromEntries(neighborhoods.map((nb) => [nb.id, assetNames.get(nb.id)])),
    null,
    2,
  )};

export const getNeighborhoodImageName = (id: string): string | undefined => {
  return neighborhoodImageMap[id];
};
`;
  fs.writeFileSync(UTIL_MAP_PATH, utilMapContent);
  console.log(`📝 Regenerated: ${path.relative(REPO_ROOT, UTIL_MAP_PATH)}`);
}

if (require.main === module) main();

module.exports = { toIdentifier };
