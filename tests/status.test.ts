import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_STATUSES,
  ARTICLE_STATUS_LABEL,
  COMMENT_STATUSES,
  COMMENT_STATUS_LABEL,
} from "../packages/shared/src/status.js";

const schema = readFileSync(
  fileURLToPath(new URL("../supabase/tables.sql", import.meta.url)),
  "utf8",
);

/**
 * Pull the allowed values out of a table's `status` CHECK constraint, e.g.
 *   status text NOT NULL DEFAULT 'draft'::text
 *     CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, ...]))
 */
function statusesInSchema(table: string): string[] {
  const block = schema.split(`CREATE TABLE public.${table}`)[1]?.split("CREATE TABLE")[0];
  if (!block) throw new Error(`No CREATE TABLE for ${table} in tables.sql`);

  const check = /status[^\n]*CHECK \(status = ANY \(ARRAY\[([^\]]+)\]\)\)/.exec(block);
  if (!check?.[1]) throw new Error(`No status CHECK constraint on ${table}`);

  return [...check[1].matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

/**
 * The TypeScript unions and the database CHECK constraints are two independent
 * copies of the same vocabulary. Nothing but this test keeps them in step, and
 * a mismatch is silent until a write is rejected at runtime.
 */
describe("status vocabularies match the database schema", () => {
  it("articles", () => {
    expect([...ARTICLE_STATUSES].sort()).toEqual(statusesInSchema("processed_articles").sort());
  });

  it("comments", () => {
    expect([...COMMENT_STATUSES].sort()).toEqual(statusesInSchema("comments").sort());
  });
});

describe("labels", () => {
  it("every article status has a non-empty label", () => {
    for (const s of ARTICLE_STATUSES) expect(ARTICLE_STATUS_LABEL[s], s).toBeTruthy();
  });

  it("every comment status has a non-empty label", () => {
    for (const s of COMMENT_STATUSES) expect(COMMENT_STATUS_LABEL[s], s).toBeTruthy();
  });

  it("labels no status the database would reject", () => {
    // A label for a value outside the union means the UI can offer a status
    // the database will refuse to store.
    expect(Object.keys(ARTICLE_STATUS_LABEL).sort()).toEqual([...ARTICLE_STATUSES].sort());
    expect(Object.keys(COMMENT_STATUS_LABEL).sort()).toEqual([...COMMENT_STATUSES].sort());
  });
});

describe("the AI's landing status is a real one", () => {
  it("process-articles writes a status the schema allows", () => {
    // The edge function hard-codes `status: "draft"`; if that vocabulary ever
    // changes, every processed article silently fails to insert.
    const fn = readFileSync(
      fileURLToPath(new URL("../supabase/functions/process-articles/index.ts", import.meta.url)),
      "utf8",
    );
    const written = /status:\s*"([a-z]+)"/.exec(fn)?.[1];
    expect(written).toBeDefined();
    expect(ARTICLE_STATUSES).toContain(written);
  });
});
