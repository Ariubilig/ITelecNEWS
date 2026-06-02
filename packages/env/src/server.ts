import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server-side environment for the scraper (Node runtime). Reads from `process.env`
 * and is validated once, at import time — so import this module *before* any code
 * that touches these vars.
 *
 * IMPORTANT: populate `process.env` first (e.g. `import "dotenv/config"` as the very
 * first import in your entry file). ESM evaluates imported modules in source order,
 * so dotenv must be imported above anything that pulls in this module.
 */
export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
