import { describe, expect, it } from "vitest";
import {
  collectArticleUrls,
  describeHtml,
  parseArticle,
} from "../apps/scraper/scrape/parse.js";

const BASE = "https://unread.today";

/**
 * Fixtures mirror the source's real markup, quirks included: the cover image
 * and the headline both link to the same article, `<h1 >` carries a stray
 * space, and the intro is invalid `<p><p>` nesting. Those are the details that
 * decide whether the parser behaves like the browser this replaced.
 */
const CATEGORY_HTML = `
<div id="articles1-body">
  <div class="article1-container"><div class="article1" data-id="7031">
    <div class="content">
      <a class="cover" href="${BASE}/c/alpha"><div class="cover"></div></a>
      <h6 class="category"><a href="${BASE}/category/7">7 Хоногийн Тойм</a></h6>
      <h3 class="title uk-text-break"><a href="${BASE}/c/alpha">Alpha</a></h3>
    </div>
  </div></div>
  <div class="article1-container"><div class="article1" data-id="7012">
    <h3 class="title uk-text-break"><a href="/c/beta">Beta</a></h3>
  </div></div>
</div>
<h3 class="title"><a href="${BASE}/c/outside-the-container">Outside</a></h3>`;

const ARTICLE_HTML = `<html><head>
<title>Alpha — unread.today</title>
<meta property="og:image" content="${BASE}/files/44/abc.JPG">
</head><body>
<p class="uk-article-meta text-medium">
  <a href="/category/7">7 Хоногийн Тойм</a> <br><span>8 сарын 2, 2026</span><span class="pre-dot">10 мин</span>
</p>
<a href="/c/alpha"><h1 class="uk-article-title">Бүтэлгүй   төлөвлөгөө</h1></a>
<div class="article-body no-wide-image">
  <h1 >1 гол сэдэв</h1><p><p><b>Юу болов? </b></p><p>Текст</p>
</div>
</body></html>`;

describe("collectArticleUrls", () => {
  it("collects one URL per article, absolute", () => {
    expect(collectArticleUrls(CATEGORY_HTML, BASE)).toEqual([
      `${BASE}/c/alpha`,
      `${BASE}/c/beta`,
    ]);
  });

  it("resolves relative hrefs against the base", () => {
    expect(collectArticleUrls(CATEGORY_HTML, BASE)).toContain(`${BASE}/c/beta`);
  });

  it("ignores the cover link, which points at the same article", () => {
    // Both the cover <a> and the headline <a> target the article. Selecting
    // only `h3.title a` is what keeps each article from being fetched twice.
    expect(collectArticleUrls(CATEGORY_HTML, BASE)).toHaveLength(2);
  });

  it("ignores headlines outside the listing container", () => {
    expect(collectArticleUrls(CATEGORY_HTML, BASE).join()).not.toContain("outside-the-container");
  });

  it("returns nothing for a page that isn't the listing", () => {
    // The empty result is what the caller turns into a loud failure, rather
    // than silently reporting a successful run that scraped zero articles.
    expect(collectArticleUrls("<html><body>Access denied</body></html>", BASE)).toEqual([]);
  });
});

describe("parseArticle", () => {
  const article = parseArticle(ARTICLE_HTML)!;

  it("collapses whitespace in the title, as innerText did", () => {
    expect(article.title).toBe("Бүтэлгүй төлөвлөгөө");
  });

  it("takes the publication date, not the reading time", () => {
    // `.uk-article-meta span` matches both; the date is the first.
    expect(article.date).toBe("8 сарын 2, 2026");
  });

  it("reads the hero image from og:image", () => {
    expect(article.image).toBe(`${BASE}/files/44/abc.JPG`);
  });

  it("repairs the source's invalid <p><p> nesting", () => {
    // parse5 applies the same correction a browser does, so the stored body
    // matches what the previous headless-Chrome scraper produced.
    expect(article.body).not.toMatch(/<p>\s*<p>/);
    expect(article.body).toContain("<p><b>Юу болов? </b></p>");
  });

  it("normalises malformed tags rather than storing them verbatim", () => {
    expect(article.body).toContain("<h1>1 гол сэдэв</h1>");
    expect(article.body).not.toContain("<h1 >");
  });

  it("keeps only the body's children, not the wrapper itself", () => {
    expect(article.body).not.toContain("article-body");
  });

  it("returns null when the body element is missing", () => {
    expect(parseArticle("<html><body><h1>Nope</h1></body></html>")).toBeNull();
  });

  it("leaves the image empty rather than failing when og:image is absent", () => {
    const noImage = parseArticle(ARTICLE_HTML.replace(/<meta property="og:image"[^>]*>/, ""));
    expect(noImage?.image).toBe("");
    expect(noImage?.title).toBe("Бүтэлгүй төлөвлөгөө");
  });
});

describe("describeHtml", () => {
  it("reports the evidence needed to explain an unexpected response", () => {
    const out = describeHtml("<html><head><title>Just a moment…</title></head>" +
      "<body>Checking your browser before accessing unread.today.</body></html>",
      `${BASE}/category/7`);

    expect(out).toContain(`${BASE}/category/7`);
    expect(out).toContain("Just a moment…");
    expect(out).toContain("Checking your browser");
    expect(out).toMatch(/size\s+: \d+ bytes/);
  });

  it("truncates a long body so one failure can't flood the log", () => {
    const out = describeHtml(`<html><body>${"x".repeat(5000)}</body></html>`, BASE);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(600);
  });

  it("says so plainly when there is no title", () => {
    expect(describeHtml("<html><body>hi</body></html>", BASE)).toContain("(none)");
  });
});
