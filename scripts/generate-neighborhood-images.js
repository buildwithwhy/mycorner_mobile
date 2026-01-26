#!/usr/bin/env node

/**
 * Neighborhood Image Generator
 *
 * Generates AI illustrations for all neighborhoods using OpenAI's DALL-E 3 API.
 *
 * Usage:
 *   OPENAI_API_KEY=your-key node scripts/generate-neighborhood-images.js
 *
 * Options:
 *   --dry-run    Show prompts without generating (free)
 *   --start=N    Start from neighborhood index N (for resuming)
 *   --only=id    Generate only a specific neighborhood by ID
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const STYLE_PREFIX = `Soft watercolor illustration with subtle anime influence, cozy and warm saturated colors, clean composition with gentle edges, cute and inviting atmosphere. Square format, no text, no words, no letters.`;

// ID to human-readable filename mapping
const idToName = {
  // London
  '1': 'shoreditch', '2': 'clapham', '3': 'brixton', '4': 'camden', '5': 'greenwich',
  '6': 'notting-hill', '7': 'hackney-wick', '8': 'richmond', '9': 'peckham', '10': 'wimbledon',
  '11': 'dalston', '12': 'canary-wharf', '13': 'dulwich', '14': 'stratford', '15': 'islington',
  '16': 'wandsworth', '17': 'hampstead', '18': 'bethnal-green', '19': 'battersea', '20': 'crouch-end',
  '21': 'bermondsey', '22': 'ealing', '23': 'putney', '24': 'kentish-town', '25': 'balham',
  '26': 'hackney-central', '27': 'fulham', '28': 'walthamstow', '29': 'kensington', '30': 'tooting',
  '31': 'angel', '32': 'chiswick', '33': 'deptford', '34': 'st-johns-wood', '35': 'stoke-newington',
  '36': 'forest-hill', '37': 'clapham-north', '38': 'elephant-and-castle', '39': 'marylebone', '40': 'crystal-palace',
  // New York
  'ny-1': 'upper-west-side', 'ny-2': 'upper-east-side', 'ny-3': 'greenwich-village', 'ny-4': 'soho',
  'ny-5': 'tribeca', 'ny-6': 'chelsea', 'ny-7': 'east-village', 'ny-8': 'lower-east-side',
  'ny-9': 'harlem', 'ny-10': 'hells-kitchen', 'ny-11': 'williamsburg', 'ny-12': 'dumbo',
  'ny-13': 'brooklyn-heights', 'ny-14': 'park-slope', 'ny-15': 'greenpoint', 'ny-16': 'bushwick',
  'ny-17': 'cobble-hill', 'ny-18': 'fort-greene', 'ny-19': 'bedford-stuyvesant', 'ny-20': 'crown-heights',
  'ny-21': 'astoria', 'ny-22': 'long-island-city', 'ny-23': 'flushing', 'ny-24': 'jackson-heights',
  'ny-25': 'forest-hills', 'ny-26': 'south-bronx', 'ny-27': 'riverdale', 'ny-28': 'fordham',
  'ny-29': 'st-george', 'ny-30': 'tottenville',
};

// Neighborhood highlight to scene mapping
const neighborhoodPrompts = {
  // London
  '1': 'A trendy urban street corner with colorful graffiti murals on brick walls, a cozy hipster cafe with warm light glowing from windows, string lights overhead, and creative professionals visible through the window.',
  '2': 'A sunny park common with families having picnics on green grass, children flying kites, a bandstand in the distance, mature trees providing dappled shade, and Victorian terraced houses lining the edges.',
  '3': 'A vibrant covered market scene with colorful Caribbean food stalls, tropical fruits displayed in wooden crates, reggae music notes floating in the air, warm string lights, and diverse happy shoppers.',
  '4': 'A quirky canal-side market with eclectic stalls, a narrowboat decorated with flowers, alternative fashion displayed on vintage mannequins, and a cozy music venue with warm glow reflecting on water.',
  '5': 'A hilltop park scene with the domed Royal Observatory on top, deer grazing on slopes, a historic tall ship with masts in the harbor below, and the river winding through with classic architecture.',
  '6': 'A charming street of pastel-colored Victorian townhouses in pink, blue, yellow and mint, antique market stalls with vintage treasures, flower boxes on windows, and elegant residents strolling.',
  '7': 'Converted industrial warehouses with large windows showing artists at work, craft brewery with copper tanks visible, canal boats, and a distinctive curved stadium roof visible in the background.',
  '8': 'A serene royal park with gentle deer grazing under ancient oak trees, wildflowers in meadows, a winding river in the background, and quaint village buildings with warm chimneys in the distance.',
  '9': 'A trendy rooftop bar scene at sunset with string lights, people enjoying drinks with city views, colorful street art on nearby buildings, and a park with mature trees visible below.',
  '10': 'A charming village scene with a grass tennis court, players in white, a windmill on the common in the background, cozy tea shops with striped awnings, and families walking along tree-lined paths.',
  '11': 'A lively street market scene with Turkish food stalls serving kebabs, warm glowing music venues, neon signs, diverse crowd enjoying the evening, and colorful produce under market awnings.',
  '12': 'A modern riverside scene with gleaming skyscrapers reflecting in calm dock waters, sleek apartment buildings, waterfront cafes with warm lighting, and professionals enjoying evening walks.',
  '13': 'A refined village scene with a classical picture gallery building, children in school uniforms walking past, leafy parks with mature trees, elegant Georgian houses, and families enjoying afternoon.',
  '14': 'A modern regenerated area with a distinctive curved velodrome roof, parklands with wildflower meadows, modern apartments, and families cycling along wide paths with fountains.',
  '15': 'An elegant Georgian street with white townhouses, antique shops displaying vintage treasures, cozy bistros with warm candlelit windows, and well-dressed couples browsing along tree-lined pavement.',
  '16': 'A peaceful common with families playing, dogs running freely, a gentle river path with joggers, Victorian terraced houses in warm brick, and a cozy pub with hanging flower baskets.',
  '17': 'A wild heath landscape with a peaceful swimming pond surrounded by willows, rolling hills with city skyline distant, a quaint village high street with bookshops, and people reading on benches.',
  '18': 'A vibrant flower market with buckets of colorful blooms, plant-filled cafes with exposed brick, Victorian park with boating lake visible, and happy shoppers carrying wrapped bouquets.',
  '19': 'An iconic power station with four white chimneys at sunset, riverside park with cherry blossoms, a pagoda temple, joggers along the river path, and modern apartment buildings.',
  '20': 'A cozy village high street with independent bookshops, artisan bakeries, a clock tower, families at outdoor cafe tables, bunting strung between Victorian buildings, and warm community atmosphere.',
  '21': 'A railway arch street food market with warm smoky grills, artisan vendors, converted warehouse lofts with industrial windows, and a famous bridge visible in the distance along the riverside.',
  '22': 'A leafy suburban common with a vintage cinema marquee, families walking past Edwardian houses, children on swings in a playground, mature chestnut trees, and a cozy high street.',
  '23': 'A riverside scene with rowing boats gliding on the water, a historic bridge, rowers carrying sculls from boathouses, heathland with autumn colors in the background, and riverside pubs.',
  '24': 'A lively neighborhood street with a cozy music venue glowing warmly, independent record shops, vintage clothing stores, young people chatting outside cafes, and Victorian terraces.',
  '25': 'A buzzing high street at dusk with wine bars and restaurants spilling onto pavements, young professionals socializing, warm fairy lights, Victorian architecture, and a classic tube station.',
  '26': 'A Saturday market scene with artisan food stalls, vintage finds, people lounging in a park with picnics, cyclists with baskets of produce, and creative murals on nearby buildings.',
  '27': 'An elegant riverside scene with a Tudor palace and gardens, swans on the water, well-dressed families walking dogs on the village green, and charming pubs with flower-covered facades.',
  '28': "Europe's longest street market with colorful fabric stalls, fresh produce, wetland reserve with herons and reeds in the background, an Arts and Crafts house museum, and diverse shoppers.",
  '29': 'An elegant scene with grand museum buildings featuring ornate facades, palace gardens with formal flower beds, upscale boutiques, and well-dressed visitors admiring the architecture.',
  '30': 'A vibrant indoor market with diverse food stalls, colorful curry houses with warm glowing windows, an art deco outdoor swimming lido with happy swimmers, and friendly community atmosphere.',
  '31': 'A bustling shopping street with elegant restaurants, antique arcades, trendy boutiques, couples dining at candlelit tables visible through windows, and a classic underground roundel sign.',
  '32': 'A Palladian villa with formal Italian gardens, riverside walks with weeping willows, leafy residential streets with elegant houses, families cycling, and a cozy high street with artisan shops.',
  '33': 'A traditional street market with eclectic stalls, artist studios in railway arches, street art murals, creative young people browsing, and a mix of historic buildings with new developments.',
  '34': 'An elegant tree-lined avenue with white Regency villas, a famous cricket ground pavilion, immaculate gardens, a quiet refined atmosphere, and well-dressed residents walking small dogs.',
  '35': 'A friendly village scene with a Victorian park featuring deer enclosure and aviaries, independent bookshops, families at cozy cafes, church spire in background, and community spirit.',
  '36': 'A quirky museum with clock tower set in lush gardens, exotic displays, bandstand, families exploring nature trails, panoramic city views, and friendly neighborhood shops below.',
  '37': 'A lively evening scene near a common with trendy bars and restaurants, young professionals socializing, tube station entrance, the green common at sunset, and Victorian terraces with warm lights.',
  '38': 'A dynamic urban scene showing transformation, with modern tower developments alongside historic buildings, a busy transport interchange, new parks and public spaces, and diverse community life.',
  '39': 'A charming village-like high street with upscale boutiques, artisan food shops, cozy cafes with outdoor seating, royal park roses visible beyond, and elegant Georgian townhouses.',
  '40': 'A whimsical park scene with Victorian dinosaur sculptures by a lake, children excitedly exploring, panoramic city views from the hilltop, community festival atmosphere, and a tall transmitter tower.',

  // New York
  'ny-1': 'Classic brownstones along tree-lined streets, Central Park autumn foliage visible, a grand museum with columned entrance, families strolling to a fountain plaza at twilight.',
  'ny-2': 'An elegant avenue with grand museum facades, upscale boutiques with awnings, well-dressed families near a park entrance, uniformed schoolchildren, and classic pre-war apartment buildings.',
  'ny-3': 'An iconic arch in a park surrounded by autumn trees, students with books, a cozy jazz club with warm neon sign, historic brownstones, and street musicians playing.',
  'ny-4': 'A cobblestone street with ornate cast-iron building facades, chic fashion boutiques with stylish window displays, art gallery openings with warm light, and fashionable shoppers.',
  'ny-5': 'Industrial converted warehouse lofts with large windows glowing warmly, cobblestone streets, a waterfront at sunset, upscale restaurants, and a film premiere atmosphere.',
  'ny-6': 'An elevated park with wildflowers and grasses, people strolling past art installations, gallery openings below, an industrial market entrance, and modern towers in the distance.',
  'ny-7': 'An eclectic street scene with dive bars glowing neon, a legendary music venue, diverse food carts, a park with musicians jamming, and punk rock posters on lampposts.',
  'ny-8': 'A trendy street with vintage clothing shops, fire escape-covered tenement buildings, hip cocktail bars with warm glow, pickle barrels and bakery windows, and diverse nightlife crowds.',
  'ny-9': 'An iconic theater marquee glowing warmly, beautiful brownstone row houses, a soul food restaurant with steaming windows, jazz notes floating in the air, and community pride.',
  'ny-10': 'A bustling restaurant row with diverse cuisines, theater marquees glowing in the distance, a waterfront at sunset, outdoor dining patios, and theatergoers heading to shows.',
  'ny-11': 'A hip waterfront scene with city skyline reflecting on the river, converted warehouse venues, vintage shops with neon signs, rooftop bars, and creative young people socializing.',
  'ny-12': 'An iconic bridge framed between brick warehouses on cobblestone streets, waterfront park carousel, stunning skyline views at golden hour, and tech workers at cafe laptops.',
  'ny-13': 'A famous promenade with romantic skyline views, elegant brownstone townhouses with stoops, tree-lined quiet streets, families walking, and a great bridge in the distance.',
  'ny-14': 'A tree-lined street of beautiful brownstones with stoops, a park meadow with families picnicking, children at a playground, farmers market stalls, and a cozy neighborhood bookshop.',
  'ny-15': 'A charming neighborhood street with Polish bakeries and pierogi shops, indie record stores, a park with people playing, waterfront views, and church spires in the skyline.',
  'ny-16': 'Warehouse walls covered in vibrant street art murals, artist studios with large windows, warehouse party venues with glowing lights, and creative young artists carrying canvases.',
  'ny-17': 'A charming tree-lined street with brownstones, boutique shops with pretty window displays, intimate restaurants with candlelit tables visible, families with strollers, and quiet residential charm.',
  'ny-18': 'A performing arts center with evening lights, a park with rolling hills and monument, beautiful brownstones, diverse cultural crowds heading to shows, and street musicians.',
  'ny-19': 'A beautiful block of historic brownstones with ornate details and stoops, tree-lined streets, new cafes opening, community gardens, and neighbors chatting on their steps.',
  'ny-20': 'A vibrant street with Caribbean restaurants and bakeries, a grand museum entrance, park greenery, diverse families, and colorful murals celebrating culture.',
  'ny-21': 'A lively beer garden scene with string lights, diverse restaurants serving Greek and Middle Eastern cuisines, a park with a historic bridge, and friendly neighborhood atmosphere.',
  'ny-22': 'A modern waterfront with stunning skyline views, a contemporary art center, new glass towers, historic industrial gantries in a park, and sunset reflections.',
  'ny-23': 'A bustling Asian food paradise with dumpling shops, bubble tea stores, a great park with iconic globe sculpture, diverse families, temples, and authentic signage.',
  'ny-24': 'An incredibly diverse street with South Asian sari shops, Latin American bakeries, dumplings, historic garden apartments, diverse families, and food carts with various cuisines.',
  'ny-25': 'Charming Tudor-style houses with half-timbered facades, a historic tennis stadium, tree-lined streets, families walking to schools, and a peaceful suburban atmosphere.',
  'ny-26': 'A vibrant scene celebrating hip-hop culture with boombox and breakdancing imagery, colorful murals, a baseball stadium in the background, community gathering, and creative street energy.',
  'ny-27': 'Beautiful gardens overlooking a river, leafy suburban streets with grand houses, vast forest park, families hiking, and a peaceful escape-from-the-city atmosphere.',
  'ny-28': 'A grand zoo entrance with families and excited children, a botanical garden conservatory dome, Gothic university campus, and a scholarly atmosphere.',
  'ny-29': 'A ferry approaching with stunning skyline and statue views, historic cultural center buildings and gardens, art galleries, and waterfront atmosphere.',
  'ny-30': 'A peaceful seaside community with beach access, a historic colonial house, quiet tree-lined residential streets, seagulls, coastal marshes, and families enjoying the shore at sunset.',
};

const OUTPUT_DIR = path.join(__dirname, '../src/assets/neighborhood-images');

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const startIndex = args.find(a => a.startsWith('--start='))?.split('=')[1];
const onlyId = args.find(a => a.startsWith('--only='))?.split('=')[1];

async function generateImage(prompt, filename) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const fullPrompt = `${STYLE_PREFIX} ${prompt}`;

  const requestBody = JSON.stringify({
    model: 'dall-e-3',
    prompt: fullPrompt,
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
      res.on('data', chunk => data += chunk);
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Create output directory
  if (!dryRun && !fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const neighborhoods = Object.entries(neighborhoodPrompts);
  let startIdx = startIndex ? parseInt(startIndex, 10) : 0;

  console.log(`\n🎨 Neighborhood Image Generator`);
  console.log(`================================`);
  console.log(`Total neighborhoods: ${neighborhoods.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no API calls)' : 'LIVE (will generate images)'}`);

  if (onlyId) {
    console.log(`Only generating: ${onlyId}`);
  } else if (startIdx > 0) {
    console.log(`Starting from index: ${startIdx}`);
  }

  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error('\n❌ Error: OPENAI_API_KEY environment variable is required');
    console.log('Usage: OPENAI_API_KEY=sk-... node scripts/generate-neighborhood-images.js');
    process.exit(1);
  }

  const estimatedCost = (neighborhoods.length - startIdx) * 0.04;
  if (!dryRun) {
    console.log(`\n💰 Estimated cost: ~$${estimatedCost.toFixed(2)} (DALL-E 3 standard)`);
    console.log(`\nStarting in 3 seconds... (Ctrl+C to cancel)\n`);
    await sleep(3000);
  }

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = startIdx; i < neighborhoods.length; i++) {
    const [id, prompt] = neighborhoods[i];

    if (onlyId && id !== onlyId) {
      continue;
    }

    const name = idToName[id] || id;
    const filename = `${name}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (!dryRun && fs.existsSync(filepath)) {
      console.log(`⏭️  [${i + 1}/${neighborhoods.length}] Skipping ${name} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`🖼️  [${i + 1}/${neighborhoods.length}] Generating ${name}...`);

    if (dryRun) {
      console.log(`   📝 Prompt: "${STYLE_PREFIX} ${prompt.substring(0, 60)}..."`);
      generated++;
      continue;
    }

    try {
      const imageBuffer = await generateImage(prompt, filename);

      if (imageBuffer) {
        fs.writeFileSync(filepath, imageBuffer);
        console.log(`   ✅ Saved: ${filename}`);
        generated++;
      }

      // Rate limit: wait between requests (DALL-E 3 has limits)
      if (!dryRun && i < neighborhoods.length - 1) {
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
    console.log(`\nNext step: Update your app to use these images!`);
  }
}

main().catch(console.error);
