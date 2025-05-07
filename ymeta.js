const fs = require('fs');
const { parse } = require('json2csv');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('result/missing.json', 'utf8'));

// Encode 'Image Src' URLs so all are recognized as links in spreadsheets
const updatedData = jsonData.map(item => ({
  ...item,
  "Image Src": item["Image Src"] ? encodeURI(item["Image Src"]) : ""
}));

// Convert to CSV
const csv = parse(updatedData);

// Write CSV file
fs.writeFileSync('result/missing.csv', csv);

console.log('CSV file created: result/missing.csv');