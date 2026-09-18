import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

// The `live` project talks to the REAL dev backend and Wompi sandbox with a real account, so it
// only exists when explicitly asked for (`--project=live`, a path under e2e/live, or
// E2E_LIVE=1). A plain `npx playwright test` and CI never see it.
const isLiveRun =
  process.env.E2E_LIVE === "1" ||
  process.argv.some(
    (arg) =>
      arg === "live" || arg === "--project=live" || arg.includes("e2e/live"),
  );

// Workers re-evaluate this config but do NOT inherit the CLI's argv: without this they would not
// see the `live` project ("Project "live" not found in the worker process"). The environment,
// unlike argv, is inherited by the workers spawned after this point.
if (isLiveRun) process.env.E2E_LIVE = "1";

if (isLiveRun) {
  try {
    // Gitignored (`*.local`). Never overrides variables already set in the shell.
    // process.loadEnvFile needs Node >= 20.12.
    process.loadEnvFile(".env.e2e.local");
  } catch (error) {
    // A missing file is normal (credentials may come from the shell; the live tests skip if
    // absent). Anything else (unsupported Node, unreadable file) is worth a heads-up: only the
    // error code is printed, never file contents or values.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        `Could not load .env.e2e.local (${(error as NodeJS.ErrnoException).code ?? "unknown error"}); Node >= 20.12 is required.`,
      );
    }
  }
}

export default defineConfig({
  testDir: "./e2e",
  // Live login, once, in the main process (only when the live project was asked for).
  globalSetup: isLiveRun ? "./e2e/live/global-setup.ts" : undefined,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/e2e/live/**",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(isLiveRun
      ? [
          {
            name: "live",
            testMatch: "**/e2e/live/*.spec.ts",
            // The spec is a single file: not fully parallel => one worker.
            fullyParallel: false,
            use: {
              ...devices["Desktop Chrome"],
              // Traces/screenshots/videos would capture the login request and stored tokens.
              trace: "off" as const,
              screenshot: "off" as const,
              video: "off" as const,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    // The checkout spec stubs Wompi's widget, but the app still refuses to open it without a
    // public key. `.env.local` (gitignored) provides one locally; CI has no such file.
    env: {
      VITE_WOMPI_PUBLIC_KEY:
        process.env.VITE_WOMPI_PUBLIC_KEY ?? "pub_test_e2e_fake_key",
    },
  },
});
