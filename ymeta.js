const fs = require('fs');
const { parse } = require('json2csv');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('result/988(326-420).json', 'utf8'));

// Encode 'Image Src' URLs so all are recognized as links in spreadsheets
const updatedData = jsonData.map(item => ({
  ...item,
  "Image Src": item["Image Src"] ? encodeURI(item["Image Src"]) : ""
}));

// Convert to CSV
const csv = parse(updatedData);

// Write CSV file
fs.writeFileSync('result/988(326-420).csv', csv);

console.log('CSV file created: result/988(326-420).csv');