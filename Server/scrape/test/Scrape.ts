import puppeteer from "puppeteer";
import fs from "fs";


const SCRAPED_FILE = "json/scrapedURL.json";
const NEW_FILE     = "json/newURL.json";
const ARTICLE_FILE = "json/articles.json";

const readJSON = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : [];
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");


// 1: Collect URLs, keeping only ones not seen before
async function collectURLs(browser) {
  const page = await browser.newPage();

  await page.goto("https://unread.today/category/7", { waitUntil: "networkidle2" });
  await page.waitForSelector("#articles1-body");

  const foundUrls = await page.$$eval(
    "#articles1-body h3.title a",
    links => links.map(a => a.href)
  );

  await page.close();

  const scrapedUrls = readJSON(SCRAPED_FILE);
  const newUrls = foundUrls.filter(url => !scrapedUrls.includes(url));

  writeJSON(NEW_FILE, newUrls);
  writeJSON(SCRAPED_FILE, [...scrapedUrls, ...newUrls]);

  console.log(`Found ${foundUrls.length}, ${newUrls.length} new (${foundUrls.length - newUrls.length} already scraped)`);
  return newUrls;
}


// 2: Scrape articles from new URLs into the JSON store
async function scrapeArticles(browser, urls) {
  if (!urls.length) {
    console.log("⚠️  No new URLs to scrape.");
    return;
  }

  const savedArticles = readJSON(ARTICLE_FILE);
  const page = await browser.newPage();
  let success = 0, failed = 0;

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "networkidle2" });

      const article = await page.evaluate(() => {
        const body = document.querySelector(".article-body.no-wide-image");
        if (!body) return null;

        // Keep only the lead: stop before the 3rd bold-paragraph section
        let sectionCount = 0;
        const htmlParts = [];
        for (const el of body.children) {
          if (el.tagName === "P" && el.querySelector("b")) sectionCount++;
          if (sectionCount >= 3) break;
          htmlParts.push(el.outerHTML);
        }

        return {
          title: document.querySelector("h1.uk-article-title")?.innerText || "",
          date:  document.querySelector(".uk-article-meta span")?.innerText || "",
          image: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
          body:  htmlParts.join("\n"),
        };
      });

      if (!article) throw new Error("Article body not found");

      savedArticles.push({ url, ...article });
      success++;
      console.log("✅ Done:", article.title);
    } catch {
      failed++;
      console.log("❌ Failed:", url);
    }
  }

  await page.close();
  writeJSON(ARTICLE_FILE, savedArticles);
  console.log(`Done — success: ${success}, failed: ${failed}`);
}


// Main

async function main() {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: null });

  const newUrls = await collectURLs(browser);
  await scrapeArticles(browser, newUrls);

  await browser.close();
}


main();