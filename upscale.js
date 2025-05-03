const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // You'll need to install this: npm install sharp

/**
 * Upscales and converts images in a directory to WebP format
 * @param {string} inputDir - Directory containing images
 * @param {string} outputDir - Directory to save processed images
 * @param {number} scale - Scale factor for upscaling
 */
async function processImages(inputDir, outputDir, scale = 2) {
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
      const outputPath = path.join(outputDir, `${path.parse(file).name}.webp`);
      
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      
      // Calculate new dimensions maintaining aspect ratio
      const newWidth = Math.round(metadata.width * scale);
      const newHeight = Math.round(metadata.height * scale);
      
      // Process the image
      await sharp(inputPath)
        .resize(newWidth, newHeight)
        .webp({ quality: 80 }) // Adjust quality as needed
        .toFile(outputPath);
      
      console.log(`✓ Processed: ${file} → ${path.basename(outputPath)}`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('All processing complete!');
}

// Command line arguments
const args = process.argv.slice(2);
const inputDir = args[0] || '.'; // Default to current directory
const outputDir = args[1] || './upscaled'; // Default output directory
const scale = parseFloat(args[2]) || 2; // Default scale factor

// Run the script
processImages(inputDir, outputDir, scale)
  .catch(err => console.error('Error:', err.message));