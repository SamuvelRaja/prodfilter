const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // You'll need to install this: npm install sharp

// Configuration variables - set these instead of using command line arguments
const inputDir = './imgcopy'; // Directory containing source images
const outputDir = './upscaled'; // Directory to save processed images
const scale = 8; // Scale factor for upscaling

/**
 * Upscales and converts images in a directory to WebP format with high quality
 * @param {string} inputDir - Directory containing images
 * @param {string} outputDir - Directory to save processed images
 * @param {number} scale - Scale factor for upscaling
 */
async function processImages(inputDir, outputDir, scale = 4) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all files in the directory
  const files = fs.readdirSync(inputDir);
  
  // Filter image files by extension
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  console.log(`Found ${imageFiles.length} images to process`);
  
  // Process each image
  for (const file of imageFiles) {
    try {
      const inputPath = path.join(inputDir, file);
      const fileName = path.parse(file).name;
      const fileExt = path.extname(file).toLowerCase().substring(1); // Get extension without the dot
      const outputPath = path.join(outputDir, `${fileName}_${fileExt}.webp`);
      
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
          kernel: 'lanczos3' // Higher quality scaling algorithm
        })
        .webp({ 
          quality: 100, // Maximum WebP quality
          effort: 6,    // Maximum compression effort
          lossless: false // Using lossy compression with high quality
        })
        .toFile(outputPath);
      
      console.log(`✓ Processed: ${file} → ${path.basename(outputPath)} (${scale}x quality)`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('All processing complete!');
}

// Run the script with the configured variables
processImages(inputDir, outputDir, scale)
  .catch(err => console.error('Error:', err.message));