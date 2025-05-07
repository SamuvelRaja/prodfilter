const fs = require('fs');
const { parse } = require('csv-parse/sync'); // Synchronous parsing
const { stringify } = require('csv-stringify/sync'); // Synchronous stringifying

const OLD_FILE_PATH = '1500book.csv';
const NEW_FILE_PATH = 'book3000.csv';
const OUTPUT_FILE_PATH = 'book3000_filtered.csv';

// Headers we'll use for key generation (ensure they match your CSV exact headers)
const AUTHOR_HEADER = 'Author';
const TITLE_HEADER = 'Title';
const ISBN_HEADER = 'ISBN';
const CATEGORY_HEADER = 'Category'; // Used to help identify actual data rows

// Helper to clean and process rows, especially for the author fill-down
function processRows(rows) {
    let lastAuthor = '';
    const processed = [];
    for (const row of rows) {
        // Skip rows that are likely separators or completely empty
        // A row is considered a separator if all its values are empty or just placeholders like '-'
        const isEmptyRow = Object.values(row).every(val => val === null || val.toString().trim() === '' || val.toString().trim() === '-');
        // Also check if it's a data row by looking at a key field like Category
        const isLikelyDataRow = row[CATEGORY_HEADER] && row[CATEGORY_HEADER].trim() !== '' && row[CATEGORY_HEADER].trim() !== '-';

        if (isEmptyRow && !isLikelyDataRow) {
            // console.log('Skipping likely separator row:', row);
            continue;
        }

        let currentAuthor = row[AUTHOR_HEADER] ? row[AUTHOR_HEADER].toString().trim() : '';

        // Handle the "fill-down" author case
        if (currentAuthor === '""""' || currentAuthor === '') {
            row[AUTHOR_HEADER] = lastAuthor; // Modify the row object directly
        } else {
            lastAuthor = currentAuthor;
        }
        processed.push(row);
    }
    return processed;
}

// Helper to get a unique key for a book row
function getBookKey(row) {
    const isbn = row[ISBN_HEADER] ? row[ISBN_HEADER].toString().trim() : '';
    // Prioritize ISBN if it's valid and not just a placeholder
    if (isbn && isbn !== '-' && isbn !== '') {
        return `ISBN:${isbn}`;
    }

    // Fallback to Author + Title
    const author = row[AUTHOR_HEADER] ? row[AUTHOR_HEADER].toString().trim() : 'UNKNOWN_AUTHOR';
    // Titles can have leading numbers like "1. Title Name", "2.Title Name".
    // Normalize by removing this leading "number. " or "number." part for better matching.
    let title = row[TITLE_HEADER] ? row[TITLE_HEADER].toString().trim() : 'UNKNOWN_TITLE';
    title = title.replace(/^\d+\.\s*/, '').trim(); // Removes "1. ", "2. ", etc.

    return `AUTHOR_TITLE:${author}|${title}`;
}

try {
    // 1. Read and parse the old CSV file (1500book.csv)
    console.log(`Reading ${OLD_FILE_PATH}...`);
    const oldFileContent = fs.readFileSync(OLD_FILE_PATH, 'utf8');
    let oldCsvRows = parse(oldFileContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true, // In case of malformed rows
        trim: true
    });
    oldCsvRows = processRows(oldCsvRows);
    console.log(`Processed ${oldCsvRows.length} data rows from ${OLD_FILE_PATH}.`);

    // 2. Create a Set of keys from the old books for efficient lookup
    const oldBookKeys = new Set();
    for (const row of oldCsvRows) {
        oldBookKeys.add(getBookKey(row));
    }
    console.log(`Generated ${oldBookKeys.size} unique keys from old books.`);

    // 3. Read and parse the new CSV file (book3000.csv)
    console.log(`Reading ${NEW_FILE_PATH}...`);
    const newFileContent = fs.readFileSync(NEW_FILE_PATH, 'utf8');
    let newCsvRows = parse(newFileContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
    });
    const originalNewRowCount = newCsvRows.length; // Before processing
    newCsvRows = processRows(newCsvRows);
    console.log(`Processed ${newCsvRows.length} data rows from ${NEW_FILE_PATH} (original was ${originalNewRowCount}).`);

    // 4. Filter the new books: keep only those NOT present in the old set
    const filteredNewBooks = [];
    const headers = newCsvRows.length > 0 ? Object.keys(newCsvRows[0]) : []; // Get headers for stringify

    for (const row of newCsvRows) {
        if (!oldBookKeys.has(getBookKey(row))) {
            filteredNewBooks.push(row);
        }
    }
    console.log(`Found ${filteredNewBooks.length} books in ${NEW_FILE_PATH} that are not in ${OLD_FILE_PATH}.`);

    // 5. Write the filtered books to a new CSV file
    if (filteredNewBooks.length > 0) {
        const outputCsvString = stringify(filteredNewBooks, { header: true, columns: headers });
        fs.writeFileSync(OUTPUT_FILE_PATH, outputCsvString, 'utf8');
        console.log(`Successfully wrote ${filteredNewBooks.length} filtered rows to ${OUTPUT_FILE_PATH}.`);
        console.log(`Removed ${newCsvRows.length - filteredNewBooks.length} old products from the new file.`);
    } else if (newCsvRows.length > 0) {
        // If all rows were filtered out, write an empty file with headers
        const outputCsvString = stringify([], { header: true, columns: headers });
        fs.writeFileSync(OUTPUT_FILE_PATH, outputCsvString, 'utf8');
        console.log(`All books from ${NEW_FILE_PATH} were found in ${OLD_FILE_PATH}. Output file ${OUTPUT_FILE_PATH} contains only headers.`);
    } else {
        console.log(`No data rows found in ${NEW_FILE_PATH} after processing, or all were duplicates. ${OUTPUT_FILE_PATH} will be empty or just headers.`);
        // Optionally write an empty file or headers
        if (headers.length > 0) {
             const outputCsvString = stringify([], { header: true, columns: headers });
             fs.writeFileSync(OUTPUT_FILE_PATH, outputCsvString, 'utf8');
        } else {
             fs.writeFileSync(OUTPUT_FILE_PATH, '', 'utf8'); // Completely empty
        }
    }

} catch (error) {
    console.error("An error occurred:", error);
}