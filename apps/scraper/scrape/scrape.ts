import "dotenv/config"; // must be first: populates process.env before @itelecnews/env validates
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { ScrapedArticle } from "@itelecnews/shared";
import supabase from "../lib/supabase.js";

const NAV_TIMEOUT_MS = 30_000; // per-navigation cap so one slow page can't stall the run
const MAX_ATTEMPTS   = 3;      // navigation retries before giving up on a URL
const POLITE_DELAY_MS = 750;   // pause between article fetches to be gentle on the source

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Retry an async step with linear backoff. Throws the last error if all attempts fail.
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        console.log(`↻ Retry ${attempt}/${MAX_ATTEMPTS - 1} for ${label}: ${(err as Error).message}`);
        await sleep(attempt * 1000);
      }
    }
  }
  throw lastErr;
}


// 1: Collect all article URLs from /category/7
async function collectURLs(browser: Browser): Promise<string[]> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

  try {
    await withRetry("category page", async () => {
      await page.goto("https://unread.today/category/7", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#articles1-body", { timeout: NAV_TIMEOUT_MS });
    });

    const urls = await page.$$eval(
      "#articles1-body h3.title a",
      links => links.map(a => (a as HTMLAnchorElement).href)
    );

    console.log(`Found ${urls.length} URLs`);
    return urls;
  } finally {
    await page.close();
  }
}


// Scrape a single article. Returns null if the body element is missing.
async function scrapeArticle(page: Page, url: string): Promise<ScrapedArticle | null> {
  return withRetry(url, async () => {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".article-body.no-wide-image", { timeout: NAV_TIMEOUT_MS });

    return page.evaluate(() => {
      const body = document.querySelector(".article-body.no-wide-image");
      if (!body) return null;
      return {
        title: document.querySelector<HTMLElement>("h1.uk-article-title")?.innerText || "",
        date:  document.querySelector<HTMLElement>(".uk-article-meta span")?.innerText || "",
        image: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
        body:  Array.from(body.children).map(el => el.outerHTML).join("\n"),
      };
    });
  });
}


// 2: Scrape each URL and insert into Supabase (DB skips duplicates via unique URL)
async function scrapeAndInsert(browser: Browser, urls: string[]): Promise<void> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  let inserted = 0, skipped = 0, failed = 0;

  try {
    for (const url of urls) {
      try {
        const article = await scrapeArticle(page, url);
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
      await sleep(POLITE_DELAY_MS);
    }
  } finally {
    await page.close();
  }

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

  try {
    const urls = await collectURLs(browser);
    await scrapeAndInsert(browser, urls);
  } finally {
    await browser.close();
  }
}


main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exitCode = 1;
});