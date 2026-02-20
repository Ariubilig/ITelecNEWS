import puppeteer from "puppeteer";
import supabase from "../supabase/supabaseClient.js";


// Step 1: Collect all URLs from /category/7

async function collectURLs(browser) {

  const page = await browser.newPage();

  await page.goto("https://unread.today/category/7", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#articles1-body");

  const urls = await page.$$eval(
    "#articles1-body h3.title a",
    links => links.map(a => a.href)
  );

  await page.close();

  console.log("────────────────────────────────");
  console.log("Step 1 — Collect URLs");
  console.log(" Found:", urls.length);
  console.log("────────────────────────────────");

  return urls;

}


// Step 2: Scrape each URL and insert into Supabase (skip if duplicate ofc its DB skip own dumbas)

async function scrapeAndInsert(browser, urls) {
    
  const page = await browser.newPage();

  let inserted  = 0;
  let skipped   = 0;
  let failed    = 0;

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
          if (el.tagName === "P" && el.querySelector("b")) sectionCount++;
          if (sectionCount >= 3) break;
          htmlParts.push(el.outerHTML);
        }

        return { title, date, image, body: htmlParts.join("\n") };
      });

      if (!article) throw new Error("Article body not found");

      const { error } = await supabase
        .from("articles")
        .insert({ url, ...article });

      if (error) {
        if (error.code === "23505") { // unique_violation — URL already exists
          skipped++;
          console.log("⏭️  Duplicate (skipped):", article.title);
        } else {
          throw error;
        }
      } else {
        inserted++;
        console.log("✅ Inserted:", article.title);
      }

    } catch (err) {
      failed++;
      console.log("❌ Failed:", url, "|", err.message);
    }
  }

  await page.close();

  console.log("────────────────────────────────");
  console.log("Step 2 — Scrape & Insert");
  console.log("✅ Inserted :", inserted);
  console.log("⏭️  Skipped  :", skipped);
  console.log("❌ Failed   :", failed);
  console.log("────────────────────────────────");

}


async function main() {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: null });

  const urls = await collectURLs(browser);
  await scrapeAndInsert(browser, urls);

  await browser.close();
}


main();