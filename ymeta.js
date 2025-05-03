const fs = require('fs');
const path = require('path');

// Function to recursively scan directories
function scanDirectory(directoryPath, stats = { jpg: 0, jpeg: 0, gif: 0, png: 0 }, uniqueFileNames = new Set()) {
  try {
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(filePath, stats, uniqueFileNames);
        } else {
          // Get the file extension
          const ext = path.extname(file).toLowerCase();
          
          // Add just the filename to track unique filenames
          uniqueFileNames.add(file);
          
          // Count by extension
          if (ext === '.jpg') stats.jpg++;
          else if (ext === '.jpeg') stats.jpeg++;
          else if (ext === '.gif') stats.gif++;
          else if (ext === '.png') stats.png++;
        }
      } catch (err) {
        console.error(`Error processing file ${filePath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${directoryPath}:`, err.message);
  }
  
  return { stats, uniqueFileNames };
}

// Main function
function countImageFiles(directoryPath) {
  console.log(`Scanning directory: ${directoryPath}`);
  
  const { stats, uniqueFileNames } = scanDirectory(directoryPath);
  
  console.log('\nImage file counts:');
  console.log(`JPG: ${stats.jpg}`);
  console.log(`JPEG: ${stats.jpeg}`);
  console.log(`GIF: ${stats.gif}`);
  console.log(`PNG: ${stats.png}`);
  console.log(`\nTotal image files: ${stats.jpg + stats.jpeg + stats.gif + stats.png}`);
  console.log(`Total unique filenames: ${uniqueFileNames.size}`);
}

// Get directory path from command line arguments or use current directory
const directoryPath = process.argv[2] || '.';

// Run the function
countImageFiles(directoryPath);