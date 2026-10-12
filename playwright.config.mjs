import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3000", browserName: "chromium", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: "node tests/mock-auth.mjs", url: "http://127.0.0.1:54329/health", reuseExistingServer: false },
    {
      command: "npm run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: false,
      timeout: 120000,
      env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-public-key" },
    },
  ],
});
