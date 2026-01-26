#!/usr/bin/env node

/**
 * Renames neighborhood images from ID-based names to human-readable names.
 * e.g., 1.png -> shoreditch.png, ny-1.png -> upper-west-side.png
 */

const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '../src/assets/neighborhood-images');

// ID to name mapping
const idToName = {
  // London
  '1': 'shoreditch',
  '2': 'clapham',
  '3': 'brixton',
  '4': 'camden',
  '5': 'greenwich',
  '6': 'notting-hill',
  '7': 'hackney-wick',
  '8': 'richmond',
  '9': 'peckham',
  '10': 'wimbledon',
  '11': 'dalston',
  '12': 'canary-wharf',
  '13': 'dulwich',
  '14': 'stratford',
  '15': 'islington',
  '16': 'wandsworth',
  '17': 'hampstead',
  '18': 'bethnal-green',
  '19': 'battersea',
  '20': 'crouch-end',
  '21': 'bermondsey',
  '22': 'ealing',
  '23': 'putney',
  '24': 'kentish-town',
  '25': 'balham',
  '26': 'hackney-central',
  '27': 'fulham',
  '28': 'walthamstow',
  '29': 'kensington',
  '30': 'tooting',
  '31': 'angel',
  '32': 'chiswick',
  '33': 'deptford',
  '34': 'st-johns-wood',
  '35': 'stoke-newington',
  '36': 'forest-hill',
  '37': 'clapham-north',
  '38': 'elephant-and-castle',
  '39': 'marylebone',
  '40': 'crystal-palace',
  // New York
  'ny-1': 'upper-west-side',
  'ny-2': 'upper-east-side',
  'ny-3': 'greenwich-village',
  'ny-4': 'soho',
  'ny-5': 'tribeca',
  'ny-6': 'chelsea',
  'ny-7': 'east-village',
  'ny-8': 'lower-east-side',
  'ny-9': 'harlem',
  'ny-10': 'hells-kitchen',
  'ny-11': 'williamsburg',
  'ny-12': 'dumbo',
  'ny-13': 'brooklyn-heights',
  'ny-14': 'park-slope',
  'ny-15': 'greenpoint',
  'ny-16': 'bushwick',
  'ny-17': 'cobble-hill',
  'ny-18': 'fort-greene',
  'ny-19': 'bedford-stuyvesant',
  'ny-20': 'crown-heights',
  'ny-21': 'astoria',
  'ny-22': 'long-island-city',
  'ny-23': 'flushing',
  'ny-24': 'jackson-heights',
  'ny-25': 'forest-hills',
  'ny-26': 'south-bronx',
  'ny-27': 'riverdale',
  'ny-28': 'fordham',
  'ny-29': 'st-george',
  'ny-30': 'tottenville',
};

// Also export the reverse mapping (name to ID) for app integration
const nameToId = Object.fromEntries(
  Object.entries(idToName).map(([id, name]) => [name, id])
);

function main() {
  if (!fs.existsSync(IMAGE_DIR)) {
    console.log('❌ Image directory does not exist:', IMAGE_DIR);
    return;
  }

  const files = fs.readdirSync(IMAGE_DIR);
  let renamed = 0;
  let skipped = 0;

  console.log('🔄 Renaming neighborhood images...\n');

  for (const file of files) {
    if (!file.endsWith('.png')) continue;

    const id = file.replace('.png', '');
    const newName = idToName[id];

    if (!newName) {
      // Already renamed or unknown
      skipped++;
      continue;
    }

    const oldPath = path.join(IMAGE_DIR, file);
    const newPath = path.join(IMAGE_DIR, `${newName}.png`);

    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Skipping ${file} -> ${newName}.png (already exists)`);
      skipped++;
      continue;
    }

    fs.renameSync(oldPath, newPath);
    console.log(`✅ ${file} -> ${newName}.png`);
    renamed++;
  }

  console.log(`\n================================`);
  console.log(`Renamed: ${renamed}`);
  console.log(`Skipped: ${skipped}`);

  // Generate the mapping file for the app
  const mappingContent = `// Auto-generated mapping of neighborhood IDs to image names
// Run: node scripts/rename-neighborhood-images.js

export const neighborhoodImageMap: Record<string, string> = ${JSON.stringify(idToName, null, 2)};

export const getNeighborhoodImageName = (id: string): string | undefined => {
  return neighborhoodImageMap[id];
};
`;

  const mappingPath = path.join(__dirname, '../src/utils/neighborhoodImages.ts');
  fs.writeFileSync(mappingPath, mappingContent);
  console.log(`\n📝 Generated mapping file: src/utils/neighborhoodImages.ts`);
}

main();
