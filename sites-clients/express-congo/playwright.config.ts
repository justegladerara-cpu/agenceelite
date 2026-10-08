import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    channel: (process.env.PLAYWRIGHT_CHANNEL || "chrome") as
      "chrome" | "msedge",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      APP_ENV: "demo",
      SITE_URL: "http://127.0.0.1:3000",
      LOCAL_DATABASE_PATH: ".data/e2e.db",
    },
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
