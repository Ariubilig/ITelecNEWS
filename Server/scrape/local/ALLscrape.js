import puppeteer from "puppeteer";
import fs from "fs";


const SCRAPED_FILE = "json/scrapedURL.json";
const NEW_FILE     = "json/newURL.json";
const ARTICLE_FILE = "json/articles.json";

// Step 1: Collect new URLs

async function collectURLs(browser) {

  const page = await browser.newPage();

  await page.goto("https://unread.today/category/7", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#articles1-body");

  const foundUrls = await page.$$eval(
    "#articles1-body h3.title a",
    links => links.map(a => a.href)
  );

  await page.close();

  if (!fs.existsSync(SCRAPED_FILE)) {
    fs.writeFileSync(SCRAPED_FILE, "[]", "utf-8");
  }

  const scrapedUrls = JSON.parse(fs.readFileSync(SCRAPED_FILE, "utf-8"));

  const newUrls = [];
  let skipped = 0;

  for (const url of foundUrls) {
    if (scrapedUrls.includes(url)) {
      skipped++;
    } else {
      newUrls.push(url);
      scrapedUrls.push(url);
    }
  }

  fs.writeFileSync(NEW_FILE,     JSON.stringify(newUrls,     null, 2), "utf-8");
  fs.writeFileSync(SCRAPED_FILE, JSON.stringify(scrapedUrls, null, 2), "utf-8");

  console.log("────────────────────────────────");
  console.log("Step 1 — Collect URLs");
  console.log(" Found total  :", foundUrls.length);
  console.log(" New URLs     :", newUrls.length);
  console.log(" Skipped      :", skipped);
  console.log(" Total scraped:", scrapedUrls.length);
  console.log("────────────────────────────────");

  return newUrls;
}


// Step 2: Scrape articles from new URLs

async function scrapeArticles(browser, urls) {

  if (!urls.length) {
    console.log("\n⚠️  No new URLs to scrape.");
    return;
  }

  if (!fs.existsSync(ARTICLE_FILE)) {
    fs.writeFileSync(ARTICLE_FILE, "[]", "utf-8");
  }

  const savedArticles = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf-8"));

  const page = await browser.newPage();

  let success = 0;
  let failed  = 0;

  for (const url of urls) {
    try {
      console.log("🕷️  Scraping:", url);

      await page.goto(url, { waitUntil: "networkidle2" });

      const article = await page.evaluate(() => {
        const body = document.querySelector(".article-body.no-wide-image");
        if (!body) return null;

        const title =
          document.querySelector("h1.uk-article-title")?.innerText || "";

        const date =
          document.querySelector(".uk-article-meta span")?.innerText || "";

        const image =
          document
            .querySelector('meta[property="og:image"]')
            ?.getAttribute("content") || "";

        let sectionCount = 0;
        const htmlParts  = [];

        for (const el of body.children) {
          if (el.tagName === "P" && el.querySelector("b")) {
            sectionCount++;
          }
          if (sectionCount >= 3) break;
          htmlParts.push(el.outerHTML);
        }

        return { title, date, image, body: htmlParts.join("\n") };
      });

      if (!article) throw new Error("Article body not found");

      savedArticles.push({ url, ...article });
      success++;
      console.log("✅ Done:", article.title);

    } catch (err) {
      failed++;
      console.log("❌ Failed:", url);
    }
  }

  await page.close();

  fs.writeFileSync(ARTICLE_FILE, JSON.stringify(savedArticles, null, 2), "utf-8");

  console.log("────────────────────────────────");
  console.log("Step 2 — Scrape Articles");
  console.log("✅ Success:", success);
  console.log("❌ Failed :", failed);
}


// Main

async function main() {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: null });

  const newUrls = await collectURLs(browser);
  await scrapeArticles(browser, newUrls);

  await browser.close();
}


main();