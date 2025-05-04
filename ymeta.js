const fs = require('fs');
const path = require('path');

const folder = path.join(__dirname, 'upscaled');
const baseUrl = 'https://samuvelraja.github.io/prodfilter/upscaled/';

fs.readdir(folder, (err, files) => {
  if (err) {
    console.error('Error reading folder:', err);
    return;
  }
  const links = files
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .map(f => baseUrl + encodeURIComponent(f))
    .join('\n');
  fs.writeFileSync('links.txt', links, 'utf8');
  console.log('links.txt created with', files.length, 'files.');
});