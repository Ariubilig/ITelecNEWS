import puppeteer from "puppeteer";
import fs from "fs";


const URL_FILE = "JSON/newURL.json";
const ARTICLE_FILE = "JSON/articles.json";

async function scrape() {

  
  const urls = JSON.parse(fs.readFileSync(URL_FILE, "utf-8"));

  if (!urls.length) {
    console.log("⚠️ No new URLs to scrape");
    return;
  }

  // ensure articles.json exists
  if (!fs.existsSync(ARTICLE_FILE)) {
    fs.writeFileSync(ARTICLE_FILE, "[]", "utf-8");
  }

  const savedArticles = JSON.parse(
    fs.readFileSync(ARTICLE_FILE, "utf-8")
  );

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  let success = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      console.log("🕷️ Scraping:", url);

      await page.goto(url, { waitUntil: "networkidle2" });

      const article = await page.evaluate(() => {
        const body = document.querySelector(".article-body.no-wide-image");
        if (!body) return null;

        const title =
          document.querySelector("h1.uk-article-title")?.innerText || "";

        const date =
          document
            .querySelector(".uk-article-meta span")
            ?.innerText || "";

        const image =
          document
            .querySelector('meta[property="og:image"]')
            ?.getAttribute("content") || "";

        let sectionCount = 0;
        let htmlParts = [];

        for (const el of body.children) {
          if (
            el.tagName === "P" &&
            el.querySelector("b")
          ) {
            sectionCount++;
          }

          if (sectionCount >= 3) break;

          htmlParts.push(el.outerHTML);
        }

        return {
          title,
          date,
          image,
          body: htmlParts.join("\n")
        };
      });

      if (!article) throw new Error("Article body not found");

      savedArticles.push({
        url,
        ...article
      });

      success++;
      console.log("✅ Done:", article.title);

    } catch (err) {
      failed++;
      console.log("❌ Failed:", url);
    }
  }

  await browser.close();

  fs.writeFileSync(
    ARTICLE_FILE,
    JSON.stringify(savedArticles, null, 2),
    "utf-8"
  );

  console.log("──────────────");
  console.log("✅ Success:", success);
  console.log("❌ Failed :", failed);
  
}


scrape();