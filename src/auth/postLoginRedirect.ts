const POST_LOGIN_REDIRECT_KEY = "lila_post_login_redirect";

// Only in-app destinations that a guest can legitimately be sent to before logging in. An
// allowlist (not "any path") so a tampered sessionStorage value can never become an open redirect.
const ALLOWED_PREFIXES = ["/checkout"];

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}/`),
  );
}

// Remembers where a guest was headed so AuthCallback can bring her back after the Cognito
// hosted-UI round trip (which drops the SPA state). Best-effort: storage can be unavailable
// (private mode / blocked), in which case she simply lands on the default destination.
export function savePostLoginRedirect(path: string): void {
  if (!isAllowed(path)) return;
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
  } catch {
    // Intentionally ignored: see above — losing the redirect is not worth breaking login.
  }
}

// Read-and-clear, so a later unrelated login never replays a stale destination.
export function consumePostLoginRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return path && isAllowed(path) ? path : null;
  } catch {
    return null;
  }
}
