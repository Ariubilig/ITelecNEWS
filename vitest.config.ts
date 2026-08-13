import { defineConfig } from "vitest/config";

/**
 * Tests live at the repo root rather than inside a workspace because the code
 * worth testing is spread across three of them — packages/shared, apps/web,
 * and the Deno edge function under supabase/. A root runner can import from
 * all three by relative path without any workspace gymnastics.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
