const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, 'upscaled');
const OUTPUT_FILE = path.join(__dirname, 'image_filenames.txt');

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, fileList);
        } else {
            // Save relative path from images folder
                fileList.push(path.basename(fullPath));
        }
    });
    return fileList;
}

const allFiles = getAllFiles(IMG_DIR);
fs.writeFileSync(OUTPUT_FILE, allFiles.join('\n'), 'utf8');
console.log(`Wrote ${allFiles.length} filenames to ${OUTPUT_FILE}`);