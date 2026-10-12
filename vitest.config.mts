import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // "server-only" throws outside a React server bundle; tests run server code directly.
      "server-only": fileURLToPath(new URL("./test/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    env: { NEXT_PUBLIC_SITE_URL: "https://dashboard.test", NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test" },
  },
});
