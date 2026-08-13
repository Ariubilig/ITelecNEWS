import * as cheerio from "cheerio";
import type { ScrapedArticle } from "@itelecnews/shared";

/**
 * Pure HTML→data functions, kept free of network and database imports so they
 * can be unit-tested directly (see tests/scrape.test.ts). scrape.ts owns
 * fetching, retrying and inserting; everything here just reads a string.
 *
 * Cheerio parses with parse5, the same spec-compliant algorithm browsers use,
 * so malformed source markup is corrected identically to the headless-Chrome
 * version this replaced — invalid `<p><p>` nesting is repaired rather than
 * carried through into the stored body.
 */

// innerText collapsed runs of whitespace for us; .text() does not.
export const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export const CATEGORY_LINK_SELECTOR = "#articles1-body h3.title a";
export const ARTICLE_BODY_SELECTOR  = ".article-body.no-wide-image";

/** Article URLs from a category listing page, absolute and de-duplicated. */
export function collectArticleUrls(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  return [
    ...new Set(
      $(CATEGORY_LINK_SELECTOR)
        .map((_, a) => $(a).attr("href"))
        .get()
        .filter(Boolean)
        .map((href) => new URL(href, base).href),
    ),
  ];
}

/** Returns null when the body element is absent — the caller decides how loudly to fail. */
export function parseArticle(html: string): ScrapedArticle | null {
  const $ = cheerio.load(html);

  const body = $(ARTICLE_BODY_SELECTOR).first();
  if (body.length === 0) return null;

  return {
    title: clean($("h1.uk-article-title").first().text()),
    date:  clean($(".uk-article-meta span").first().text()),
    image: $('meta[property="og:image"]').attr("content") ?? "",
    body:  body.children().map((_, el) => $.html(el)).get().join("\n"),
  };
}

/**
 * A missing element means the response was not the page we expected, and that
 * response is the only evidence of why. Summarise it for the log rather than
 * throwing it away — a challenge page, a redirect or a rate-limit notice each
 * leave an obvious fingerprint here.
 */
export function describeHtml(html: string, finalUrl: string): string {
  const $ = cheerio.load(html);
  const text = clean($("body").text());
  return [
    `\n            final URL : ${finalUrl}`,
    `title     : ${clean($("title").first().text()) || "(none)"}`,
    `size      : ${html.length} bytes`,
    `body text : ${text.slice(0, 300)}${text.length > 300 ? "…" : ""}`,
  ].join("\n            ");
}
