const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // You'll need to install this: npm install sharp

// Configuration variables - set these instead of using command line arguments
const inputDir = './images'; // Directory containing source images
const outputDir = './upscaled'; // Directory to save processed images
const scale = 2; // Scale factor for upscaling (changed from 8 to 3)

/**
 * Recursively get all image files in a directory and its subdirectories
 */
function getAllImageFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllImageFiles(filePath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

/**
 * Upscales and converts images in a directory (and subdirectories) to WebP format with high quality
 * All output images are stored in a single directory, using only the original filename (no folder names).
 * @param {string} inputDir - Directory containing images
 * @param {string} outputDir - Directory to save processed images
 * @param {number} scale - Scale factor for upscaling
 */
async function processImages(inputDir, outputDir, scale = 3) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all image files recursively
  const imageFiles = getAllImageFiles(inputDir);

  console.log(`Found ${imageFiles.length} images to process`);

  for (const inputPath of imageFiles) {
    try {
      // Use only the original file name (without folder names) for output
      const baseName = path.parse(inputPath).name;
      const fileExt = path.extname(inputPath).toLowerCase().substring(1); // Get extension without the dot
      const outputPath = path.join(outputDir, `${baseName}_${fileExt}.webp`);

      // Get image metadata
      const metadata = await sharp(inputPath).metadata();

      // Calculate new dimensions maintaining aspect ratio
      const newWidth = Math.round(metadata.width * scale);
      const newHeight = Math.round(metadata.height * scale);

      // Process the image with high quality settings
      await sharp(inputPath)
        .resize({
          width: newWidth,
          height: newHeight,
          fit: 'fill',
          kernel: 'lanczos3'
        })
        .webp({
          quality: 100,
          effort: 6,
          lossless: false
        })
        .toFile(outputPath);

      console.log(`✓ Processed: ${inputPath} → ${path.relative(outputDir, outputPath)} (${scale}x quality)`);
    } catch (error) {
      console.error(`✗ Error processing ${inputPath}:`, error.message);
    }
  }

  console.log('All processing complete!');
}

// Run the script with the configured variables
processImages(inputDir, outputDir, scale)
  .catch(err => console.error('Error:', err.message));