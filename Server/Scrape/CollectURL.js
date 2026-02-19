import puppeteer from "puppeteer";
import fs from "fs";


const SCRAPED_FILE = "scrapedURL.json";
const NEW_FILE = "newURL.json";

async function scrapeLinks() {

  
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto("https://unread.today/category/7", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#articles1-body");

  const foundUrls = await page.$$eval( // get ALL URLs from category page /7/...
    "#articles1-body h3.title a",
    links => links.map(a => a.href)
  );

  if (!fs.existsSync(SCRAPED_FILE)) { // ensure scrapedURL.json exists
    fs.writeFileSync(SCRAPED_FILE, "[]", "utf-8");
  }

  const scrapedUrls = JSON.parse( // load already scraped URLs
    fs.readFileSync(SCRAPED_FILE, "utf-8")
  );

  const newUrls = [];
  let skipped = 0;

  for (const url of foundUrls) {
    if (scrapedUrls.includes(url)) {
      skipped++;
    } else {
      newUrls.push(url);
      scrapedUrls.push(url); // mark as scraped
    }
  }

  fs.writeFileSync( // save new URLs (to be scraped later)
    NEW_FILE,
    JSON.stringify(newUrls, null, 2),
    "utf-8"
  );

  fs.writeFileSync( // update scrapedURL.json
    SCRAPED_FILE,
    JSON.stringify(scrapedUrls, null, 2),
    "utf-8"
  );

  console.log("────────────────────────");
  console.log("Found total :", foundUrls.length);
  console.log(" New URLs    :", newUrls.length);
  console.log("Skipped     :", skipped);
  console.log("Total scraped :", scrapedUrls.length);

  await browser.close();

}


scrapeLinks();