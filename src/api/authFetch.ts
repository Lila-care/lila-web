// Wraps `fetch` with automatic Cognito idToken refresh-on-401.
//
// This module can't use the `useAuth()` hook (it's not a component/hook — it's called from
// plain async functions in src/api/*.ts), so it reads/writes localStorage directly using the
// same keys AuthContext persists under (re-exported from there to avoid duplicating the
// string literals).
import {
  TOKEN_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXPIRES_AT_KEY,
} from "@/auth/AuthContext";

const BASE_URL = import.meta.env.VITE_API_URL;

// Route the admin login screen lives at (see src/App.tsx) — where we force a redirect when
// the refresh token itself is no longer valid.
const LOGIN_ROUTE = "/admin";

interface RefreshResponse {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

function forceLogoutRedirect() {
  clearAuthStorage();
  if (window.location.pathname !== LOGIN_ROUTE) {
    window.location.assign(LOGIN_ROUTE);
  }
}

async function refreshTokens(): Promise<string | null> {
  const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: storedRefreshToken }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as RefreshResponse;
  const expiresAt = Date.now() + data.expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, data.idToken);
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  return data.idToken;
}

function withAuthHeader(
  init: RequestInit | undefined,
  idToken: string,
): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${idToken}`,
    },
  };
}

// Drop-in replacement for `fetch` on authenticated endpoints: attaches the current idToken,
// and on a 401 tries exactly one refresh + retry before giving up. If the refresh itself
// fails (refresh token invalid/expired/revoked), forces a full logout + redirect to the
// admin login screen and returns the original 401 response so the caller's existing
// `handleResponse`/error handling still runs and surfaces an error as before.
export async function authFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const idToken = localStorage.getItem(TOKEN_KEY);
  const firstAttempt = await fetch(
    input,
    idToken ? withAuthHeader(init, idToken) : init,
  );

  if (firstAttempt.status !== 401) {
    return firstAttempt;
  }

  const newIdToken = await refreshTokens();
  if (!newIdToken) {
    forceLogoutRedirect();
    return firstAttempt;
  }

  return fetch(input, withAuthHeader(init, newIdToken));
}
