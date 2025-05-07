const fs = require('fs');
const path = require('path');

const upscaledDir = path.join(__dirname, 'upscaled');
const outputFile = path.join(__dirname, 'upscaled_images.txt');

// List of common image file extensions
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

fs.readdir(upscaledDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }
  // Filter only image files
  const imageFiles = files.filter(file =>
    imageExtensions.includes(path.extname(file).toLowerCase())
  );
  // Write image file names to the output file
  fs.writeFile(outputFile, imageFiles.join('\n'), err => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('Image names written to', outputFile);
    }
  });
});