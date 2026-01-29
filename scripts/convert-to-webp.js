const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../src/assets/neighborhood-images');
const outputDir = inputDir; // Same directory

async function convertImages() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));

  console.log(`Found ${files.length} PNG files to convert...\n`);

  let totalOriginal = 0;
  let totalConverted = 0;

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.png', '.webp'));

    const originalSize = fs.statSync(inputPath).size;
    totalOriginal += originalSize;

    await sharp(inputPath)
      .webp({ quality: 85 }) // Good balance of quality and size
      .toFile(outputPath);

    const newSize = fs.statSync(outputPath).size;
    totalConverted += newSize;

    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`✓ ${file} → ${file.replace('.png', '.webp')} (${savings}% smaller)`);
  }

  console.log('\n----------------------------------------');
  console.log(`Total original: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total converted: ${(totalConverted / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total savings: ${((1 - totalConverted / totalOriginal) * 100).toFixed(1)}%`);
  console.log('----------------------------------------\n');

  // Ask before deleting
  console.log('WebP conversion complete!');
  console.log('You can now delete the original PNG files with:');
  console.log('  rm src/assets/neighborhood-images/*.png');
}

convertImages().catch(console.error);
