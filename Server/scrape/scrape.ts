import puppeteer, { type Browser } from "puppeteer";
import supabase from "../lib/supabase.js";


interface Article {
  title: string;
  date:  string;
  image: string;
  body:  string;
}


// 1: Collect all article URLs from /category/7
async function collectURLs(browser: Browser): Promise<string[]> {
  const page = await browser.newPage();

  await page.goto("https://unread.today/category/7", { waitUntil: "networkidle2" });
  await page.waitForSelector("#articles1-body");

  const urls = await page.$$eval(
    "#articles1-body h3.title a",
    links => links.map(a => a.href)
  );

  await page.close();
  console.log(`Found ${urls.length} URLs`);
  return urls;
}


// 2: Scrape each URL and insert into Supabase (DB skips duplicates via unique URL)
async function scrapeAndInsert(browser: Browser, urls: string[]): Promise<void> {
  const page = await browser.newPage();
  let inserted = 0, skipped = 0, failed = 0;

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "networkidle2" });

      const article: Article | null = await page.evaluate(() => {
        const body = document.querySelector(".article-body.no-wide-image");
        if (!body) return null;
        return {
          title: document.querySelector<HTMLElement>("h1.uk-article-title")?.innerText || "",
          date:  document.querySelector<HTMLElement>(".uk-article-meta span")?.innerText || "",
          image: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
          body:  Array.from(body.children).map(el => el.outerHTML).join("\n"),
        };
      });

      if (!article) throw new Error("Article body not found");

      const { error } = await supabase.from("articles").insert({ url, ...article });

      if (!error) {
        inserted++;
        console.log("✅ Inserted:", article.title);
      } else if (error.code === "23505") { // unique_violation — URL already exists
        skipped++;
        console.log("⏭️  Duplicate:", article.title);
      } else {
        throw error;
      }
    } catch (err) {
      failed++;
      console.log("❌ Failed:", url, "|", (err as Error).message);
    }
  }

  await page.close();
  console.log(`Done — inserted: ${inserted}, skipped: ${skipped}, failed: ${failed}`);
}


async function main(): Promise<void> {

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });
  const urls = await collectURLs(browser);
  await scrapeAndInsert(browser, urls);

  await browser.close();
  
}


main();