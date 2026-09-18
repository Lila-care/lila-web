// Runs ONCE in the main process, before any worker: the live login happens here so that a bad
// password fails a single time (workers are recreated after every failed test, and a per-worker
// login would retry it and risk locking the Cognito dev account). The session is handed to the
// spec through the environment (inherited by workers); it is never printed, logged or written to
// disk, and the `live` project runs with trace/screenshot/video off.

export const LIVE_SESSION_ENV = "E2E_LIVE_SESSION";

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

// POST {VITE_API_URL}/auth/login (same call as `loginWithPassword` in src/api/lila.ts). Error
// messages carry the HTTP status only: never the response body, the email or the password.
async function loginWithApi(
  apiUrl: string,
  email: string,
  password: string,
): Promise<AuthTokens> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Live login failed: the API is unreachable (check VITE_API_URL)");
  }
  if (response.status === 403) {
    throw new Error(
      "Live login needs a new password (NEW_PASSWORD_REQUIRED): use a fully set-up test user",
    );
  }
  if (!response.ok) {
    throw new Error(`Live login failed with HTTP ${response.status}`);
  }
  return (await response.json()) as AuthTokens;
}

export default async function globalSetup() {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const apiUrl = (process.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  // Not configured: every live test skips itself, nothing to log into.
  if (!email || !password || !apiUrl) return;

  const tokens = await loginWithApi(apiUrl, email, password);
  process.env[LIVE_SESSION_ENV] = JSON.stringify(tokens);
}
