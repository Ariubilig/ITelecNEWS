import "dotenv/config"; // must be first: populates process.env before @itelecnews/env validates
import type { ScrapedArticle } from "@itelecnews/shared";
import supabase from "../lib/supabase.js";
import {
  ARTICLE_BODY_SELECTOR,
  CATEGORY_LINK_SELECTOR,
  collectArticleUrls,
  describeHtml,
  parseArticle,
} from "./parse.js";

/**
 * The source renders every page server-side, so this is a plain HTTP fetch and
 * an HTML parse — no browser to drive.
 *
 * When something is missing, `describeHtml` prints what actually came back. The
 * headless-Chrome version this replaced failed for a month with nothing in the
 * log but a selector timeout, because it discarded the response unread.
 */

const BASE         = "https://unread.today";
const CATEGORY_URL = `${BASE}/category/7`;

const REQUEST_TIMEOUT_MS = 20_000; // per-request cap so one slow page can't stall the run
const MAX_ATTEMPTS       = 4;      // fetch retries before giving up on a URL
const RETRY_BACKOFF_MS   = 2_000;  // multiplied by attempt number
const POLITE_DELAY_MS    = 750;    // pause between article fetches to be gentle on the source

// The source sends `vary: User-Agent`, so identify as an ordinary desktop
// browser rather than as Node's default — which advertises itself as a bot.
const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/140.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "mn,en;q=0.9",
} as const;

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
        await sleep(attempt * RETRY_BACKOFF_MS);
      }
    }
  }
  throw lastErr;
}


interface Fetched {
  html: string;
  finalUrl: string; // after redirects — a redirect to a block page is a likely failure mode
}

async function fetchHtml(url: string): Promise<Fetched> {
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // Unlike a browser navigation, a bad status is an error here rather than a
  // page that renders and then fails a selector check 30 seconds later.
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`Expected HTML, got "${type}"`);

  return { html: await res.text(), finalUrl: res.url };
}

// 1: Collect all article URLs from /category/7
async function collectURLs(): Promise<string[]> {
  const { html, finalUrl } = await withRetry("category page", () => fetchHtml(CATEGORY_URL));
  const urls = collectArticleUrls(html, BASE);

  // The container can survive a redesign while the links inside it change,
  // which would leave us "succeeding" with nothing scraped and no signal
  // that the selectors have rotted. A category page always has articles.
  if (urls.length === 0) {
    throw new Error(
      `Category page had no article links — expected '${CATEGORY_LINK_SELECTOR}'. ` +
        "Either the source markup changed or this was not the page we asked for:" +
        describeHtml(html, finalUrl),
    );
  }

  console.log(`Found ${urls.length} URLs`);
  return urls;
}


// Ask the DB which of these URLs we already have. On a daily run nearly every
// URL is a repeat, and without this we'd pay a full page load plus the polite
// delay for each one only to have the unique constraint reject the insert.
async function selectNewURLs(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];

  const { data, error } = await supabase.from("articles").select("url").in("url", urls);
  if (error) {
    // Not fatal: fall back to scraping everything and let the DB dedupe.
    console.log(`⚠️  Could not check existing URLs (${error.message}); scraping all.`);
    return urls;
  }

  const known = new Set(data.map((row) => row.url));
  return urls.filter((url) => !known.has(url));
}


// Scrape a single article. Throws if the body element is missing.
async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const { html, finalUrl } = await withRetry(url, () => fetchHtml(url));

  const article = parseArticle(html);
  if (!article) {
    throw new Error(
      `Article body not found ('${ARTICLE_BODY_SELECTOR}'):` + describeHtml(html, finalUrl),
    );
  }
  return article;
}


// 2: Scrape each URL and insert into Supabase (DB skips duplicates via unique URL)
async function scrapeAndInsert(urls: string[]): Promise<void> {
  let inserted = 0, skipped = 0, failed = 0;

  for (const [i, url] of urls.entries()) {
    try {
      const article = await scrapeArticle(url);
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
    // No need to be polite after the last one.
    if (i < urls.length - 1) await sleep(POLITE_DELAY_MS);
  }

  console.log(`Done — inserted: ${inserted}, skipped: ${skipped}, failed: ${failed}`);
}


async function main(): Promise<void> {
  const urls = await collectURLs();
  const fresh = await selectNewURLs(urls);
  console.log(`${urls.length - fresh.length} already stored, ${fresh.length} to scrape`);

  if (fresh.length === 0) return;
  await scrapeAndInsert(fresh);
}


main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exitCode = 1;
});
