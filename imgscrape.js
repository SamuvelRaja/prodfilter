const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const csv = require('csv-parser');

const books = [];
const IMG_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(IMG_DIR)) {
    console.log(`Creating images directory at: ${IMG_DIR}`);
    fs.mkdirSync(IMG_DIR);
}

// Helper to create subfolder for each source
function getImgDir(source) {
    const dir = path.join(IMG_DIR, source);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_').slice(0, 100);
}

// Returns true if image saved, false otherwise
async function saveImage(url, title, source) {
    if (!url || url.includes('no-image.jpg')) {
        console.log(`Skipping image for title: ${title} (Invalid or no image URL)`);
        return false;
    }

    try {
        const imgDir = getImgDir(source);

        // Handle data URLs (base64)
        if (url.startsWith('data:image/')) {
            console.log(`Processing base64 image for: ${title}`);
            const matches = url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                console.log(`Invalid data URL format for title: ${title}`);
                return false;
            }
            
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Skip if image is very small (likely a placeholder)
            if (buffer.length < 200) {
                console.log(`Skipping placeholder image for title: ${title}, size: ${buffer.length} bytes`);
                return false;
            }
            
            const ext = '.' + mimeType.split('/')[1];
            const filename = sanitizeFilename(title) + ext;
            const filepath = path.join(imgDir, filename);
            
            fs.writeFileSync(filepath, buffer);
            console.log(`Image saved (base64): ${filepath}, Size: ${buffer.length} bytes`);
            return true;
        }

        // Handle normal URLs
        const ext = path.extname(url).split('?')[0] || '.jpg';
        const filename = sanitizeFilename(title) + ext;
        const filepath = path.join(imgDir, filename);
        console.log(`Saving image for title: ${title} from URL: ${url}`);
        return axios({ 
            url, 
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        })
        .then(res => new Promise((resolve, reject) => {
            res.data.pipe(fs.createWriteStream(filepath))
                .on('finish', () => {
                    console.log(`Image saved: ${filepath}`);
                    resolve(true);
                })
                .on('error', err => {
                    console.error(`Error saving image for title: ${title}`, err);
                    reject(false);
                });
        }))
        .catch(err => {
            console.error(`Failed to download image for title: ${title}`, err);
            return false;
        });
    } catch (err) {
        console.error(`Failed to process image for title: ${title}`, err);
        return false;
    }
}
// ...existing code...

// Scrape 1: CommonFolks
async function scrape1(title) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36');
        
        const url = `https://www.commonfolks.in/search?sv=${encodeURIComponent(title)}`;
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        const result = await page.evaluate(() => {
            const titleEl = document.querySelector('.item h4 a');
            if (!titleEl) return null;
            
            let imgUrl = null;
            const imgDiv = document.querySelector('.product_list_img');
            if (imgDiv) {
                const style = window.getComputedStyle(imgDiv).backgroundImage;
                const match = style.match(/url\(['"]?(.*?)['"]?\)/i);
                if (match) imgUrl = match[1];
            }
            
            return {
                title: titleEl.textContent.trim(),
                imgUrl: imgUrl
            };
        });
        
        if (!result) {
            console.log(`No results found on CommonFolks for title: ${title}`);
            return false;
        }

        // If the image URL is a thumbnail, convert it to the full image URL
        let fullImgUrl = result.imgUrl;
        if (fullImgUrl && fullImgUrl.includes('/images/')) {
            fullImgUrl = fullImgUrl.replace('/images/', '/images_full/');
        }
        
        console.log(`Found: "${result.title}" with image URL: ${fullImgUrl ? fullImgUrl.substring(0, 50) + '...' : 'None'}`);
        if (fullImgUrl) {
            const saved = await saveImage(fullImgUrl, result.title, 'commonfolks');
            return saved;
        }
        return false;
    } catch (e) {
        console.error(`Error scraping CommonFolks for title: ${title}`, e);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

// Scrape 2: Nool Ulagam
async function scrape2(title) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1');
        
        const url = `https://www.noolulagam.com/s/?si=1&stext=${encodeURIComponent(title)}&post_type=product`;
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        const result = await page.evaluate(() => {
            const titleEl = document.querySelector('.woocommerce ul.products li.product .title');
            if (!titleEl) return null;
            
            const imgEl = document.querySelector('.woocommerce ul.products li.product a img');
            
            return {
                title: titleEl.textContent.trim(),
                imgUrl: imgEl ? imgEl.src : null
            };
        });
        
        if (!result) {
            console.log(`No results found on Nool Ulagam for title: ${title}`);
            return false;
        }
        
        console.log(`Found: "${result.title}" with image URL: ${result.imgUrl ? result.imgUrl.substring(0, 50) + '...' : 'None'}`);
        if (result.imgUrl) {
            const saved = await saveImage(result.imgUrl, result.title, 'noolulagam');
            return saved;
        }
        return false;
    } catch (e) {
        console.error(`Error scraping Nool Ulagam for title: ${title}`, e);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

// Scrape 3: Amazon
async function scrape3(title) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Amazon blocks bots, so set a realistic user agent and viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1200, height: 800 });

        const url = `https://www.amazon.in/s?k=${encodeURIComponent(title)}`;
        console.log(`Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for images to load
        await page.waitForSelector('.s-image', { timeout: 10000 }).catch(() => null);

        // Give a little extra time for dynamic content
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        const result = await page.evaluate(() => {
            const imgEl = document.querySelector('.s-image');
            const titleEl = document.querySelector('h2 .a-text-normal');
            return {
                title: titleEl ? titleEl.textContent.trim() : null,
                imgUrl: imgEl ? imgEl.src : null
            };
        });

        if (!result || !result.imgUrl) {
            console.log(`No results found on Amazon for title: ${title}`);
            return false;
        }

        // Use the searched title if Amazon title is missing
        const saveTitle = result.title || title;
        console.log(`Found: "${saveTitle}" with image URL: ${result.imgUrl ? result.imgUrl.substring(0, 50) + '...' : 'None'}`);
        const saved = await saveImage(result.imgUrl, saveTitle, 'amazon');
        return saved;
    } catch (e) {
        console.error(`Error scraping Amazon for title: ${title}`, e);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processBook(title) {
    console.log(`\n========== Processing book: ${title} ==========`);
    
    // Try CommonFolks first
    const cfSaved = await scrape1(title);
    if (cfSaved) {
        console.log('Image found and saved from CommonFolks. Skipping other sources.');
        return;
    }
    await sleep(2000);

    // Try Nool Ulagam next
    const noolSaved = await scrape2(title);
    if (noolSaved) {
        console.log('Image found and saved from Nool Ulagam. Skipping Amazon.');
        return;
    }
    await sleep(2000);

    // Try Amazon last
    await scrape3(title);
    await sleep(2000);

    console.log(`========== Finished processing book: ${title} ==========\n`);
}

// ...existing code for reading CSV and starting processBook...
fs.createReadStream('./500-815infiltered3000.csv')
    .pipe(csv({
        mapHeaders: ({ header }) => header.trim()
    }))
    .on('data', row => {
        if (row.Title && row.Title.trim()) {
            // Remove leading numbers, dots, and spaces (e.g., "28. ")
            const cleanTitle = row.Title.trim().replace(/^\d+\.\s*/, '').replace(/[^஀-௿\s]/g, '');
            console.log(`Read book title: ${cleanTitle}`);
            books.push(cleanTitle);
        } else {
            console.log('Skipping empty or invalid row in CSV.');
        }
    })
    .on('end', async () => {
        console.log(`Finished reading CSV. Total books: ${books.length}`);
        for (const title of books) {
            await processBook(title);
            console.log(`Processed: ${title}`);
        }
        console.log('All books processed. Done.');
    });