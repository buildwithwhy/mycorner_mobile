#!/usr/bin/env node

/**
 * Neighborhood Image Generator
 *
 * Generates AI illustrations for neighborhoods missing a bundled hero image,
 * using OpenAI's DALL-E 3 API. Coverage is derived from src/data/neighborhoods/
 * and the reviewed prompt library (neighborhood-image-prompts.txt) — prompts are
 * never hardcoded here, so a new neighborhood only needs a prompt entry.
 *
 * Usage:
 *   OPENAI_API_KEY=your-key node scripts/generate-neighborhood-images.js
 *
 * Options:
 *   --dry-run    Show prompts without generating (free)
 *   --start=N    Start from pending index N (for resuming)
 *   --only=id    Generate only a specific neighborhood by ID
 *
 * Saves {asset-name}.png into src/assets/neighborhood-images/. Existing assets
 * (.webp or .png) are skipped, so the batch is resumable. Convert to WebP after:
 *   node scripts/convert-to-webp.js && node scripts/rename-neighborhood-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  normalizeForMatch,
  parsePromptLibrary,
  loadNeighborhoods,
  loadExistingAssets,
  assignAssetNames,
} = require('./lib/neighborhood-image-lib.js');
const { DATA_FILES, parseImageMap } = require('./validate-data.js');

const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'src/assets/neighborhood-images');
const UTIL_MAP_PATH = path.join(REPO_ROOT, 'src/utils/neighborhoodImages.ts');
const PROMPTS_FILE = path.join(REPO_ROOT, DATA_FILES.imagePrompts);

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const startIndex = args.find((a) => a.startsWith('--start='))?.split('=')[1];
const onlyId = args.find((a) => a.startsWith('--only='))?.split('=')[1];

// Match a neighborhood to its library prompt by city + punctuation-insensitive
// name; any neighborhood without a prompt entry is a hard error (the prompt
// library is the source of truth — see the prompts task).
function buildWorkList() {
  const neighborhoods = loadNeighborhoods((p) => fs.readFileSync(p, 'utf8'));
  const library = parsePromptLibrary(fs.readFileSync(PROMPTS_FILE, 'utf8'));
  const promptByKey = new Map(
    library.map((p) => [`${p.cityId}::${normalizeForMatch(p.name)}`, p.prompt]),
  );

  const missingPrompts = [];
  const withPrompts = neighborhoods.map((nb) => {
    const prompt = promptByKey.get(`${nb.cityId}::${normalizeForMatch(nb.name)}`);
    if (!prompt) missingPrompts.push(nb);
    return { ...nb, prompt };
  });
  if (missingPrompts.length) {
    console.error(
      `❌ No prompt in ${DATA_FILES.imagePrompts} for: ` +
        missingPrompts.map((nb) => `${nb.id} (${nb.name})`).join(', '),
    );
    process.exit(1);
  }

  const existingAssets = loadExistingAssets(fs.existsSync, fs.readdirSync, OUTPUT_DIR);
  const currentImageMap = fs.existsSync(UTIL_MAP_PATH)
    ? parseImageMap(fs.readFileSync(UTIL_MAP_PATH, 'utf8'))
    : {};
  const assetNames = assignAssetNames(neighborhoods, currentImageMap);
  const pending = withPrompts.filter((nb) => !existingAssets.has(assetNames.get(nb.id)));
  return { withPrompts, assetNames, pending };
}

async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const requestBody = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const imageData = json.data[0].b64_json;
          resolve(Buffer.from(imageData, 'base64'));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { withPrompts, assetNames, pending } = buildWorkList();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let startIdx = startIndex ? parseInt(startIndex, 10) : 0;

  console.log(`\n🎨 Neighborhood Image Generator`);
  console.log(`================================`);
  console.log(`Total neighborhoods: ${withPrompts.length}`);
  console.log(`Missing hero image: ${pending.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no API calls)' : 'LIVE (will generate images)'}`);

  if (onlyId) {
    console.log(`Only generating: ${onlyId}`);
  } else if (startIdx > 0) {
    console.log(`Starting from pending index: ${startIdx}`);
  }

  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error('\n❌ Error: OPENAI_API_KEY environment variable is required');
    console.log('Usage: OPENAI_API_KEY=sk-... node scripts/generate-neighborhood-images.js');
    process.exit(1);
  }

  const estimatedCost = (pending.length - startIdx) * 0.04;
  if (!dryRun) {
    console.log(`\n💰 Estimated cost: ~$${Math.max(estimatedCost, 0).toFixed(2)} (DALL-E 3 standard)`);
    console.log(`\nStarting in 3 seconds... (Ctrl+C to cancel)\n`);
    await sleep(3000);
  }

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = startIdx; i < pending.length; i++) {
    const nb = pending[i];

    if (onlyId && nb.id !== onlyId) {
      continue;
    }

    const filename = `${assetNames.get(nb.id)}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    console.log(`🖼️  [${i + 1}/${pending.length}] Generating ${nb.id} (${nb.name}) -> ${filename}...`);

    if (dryRun) {
      console.log(`   📝 Prompt: "${nb.prompt.substring(0, 80)}..."`);
      generated++;
      continue;
    }

    try {
      const imageBuffer = await generateImage(nb.prompt);

      if (imageBuffer) {
        fs.writeFileSync(filepath, imageBuffer);
        console.log(`   ✅ Saved: ${filename}`);
        generated++;
      }

      // Rate limit: wait between requests (DALL-E 3 has limits)
      if (i < pending.length - 1) {
        await sleep(2000); // 2 second delay between requests
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;

      // If rate limited, wait longer and retry
      if (error.message.includes('429') || error.message.includes('rate')) {
        console.log('   ⏳ Rate limited, waiting 60 seconds...');
        await sleep(60000);
        i--; // Retry this one
      }
    }
  }

  console.log(`\n================================`);
  console.log(`✨ Complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  if (!dryRun && generated > 0) {
    console.log(`\n📁 Images saved to: ${OUTPUT_DIR}`);
    console.log(`\nNext steps:`);
    console.log(`  node scripts/convert-to-webp.js`);
    console.log(`  node scripts/rename-neighborhood-images.js`);
  }

  if (errors > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { buildWorkList, generateImage };
