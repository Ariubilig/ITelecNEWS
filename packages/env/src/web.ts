import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Client-side environment for the Vite web app. Reads from `import.meta.env`,
 * which Vite statically replaces at build time. Only `VITE_`-prefixed vars are
 * exposed to the browser bundle — that prefix is enforced below.
 */
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
