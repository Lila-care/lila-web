// Cognito groups (`cognito:groups` claim of the ID token) the admin panel cares about. Mirrors
// `USER_ROLES` in ms-lila (src/auth/guards/any-role.guard.ts) — the API is the real gate, this
// only decides what the UI shows and where a user lands.
//
// Kept free of `@/` imports and `import.meta` so it can be imported from Playwright specs as
// plain TypeScript.
export const ADMIN_ROLE = "admin";
export const MEDICAL_REVIEWER_ROLE = "medical_reviewer";

export const ADMIN_HOME_PATH = "/admin/dashboard";
export const CONTENT_HOME_PATH = "/admin/content";

interface IdTokenGroupsClaim {
  "cognito:groups"?: unknown;
}

function decodeJwtPayload(idToken: string): IdTokenGroupsClaim | null {
  const encodedPayload = idToken.split(".")[1];
  if (!encodedPayload) return null;
  try {
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as IdTokenGroupsClaim;
  } catch {
    // A malformed token simply grants no roles — AuthContext already treats it as logged out.
    return null;
  }
}

export function readRolesFromIdToken(idToken: string | null): string[] {
  if (!idToken) return [];
  const groups = decodeJwtPayload(idToken)?.["cognito:groups"];
  return Array.isArray(groups)
    ? groups.filter((group): group is string => typeof group === "string")
    : [];
}

export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.includes(ADMIN_ROLE);
}

export function hasMedicalReviewerRole(roles: readonly string[]): boolean {
  return roles.includes(MEDICAL_REVIEWER_ROLE);
}

// A reviewer without the admin group only ever works on medical content — every other admin
// section is hidden from her and redirects to the content section.
export function isMedicalReviewerOnly(roles: readonly string[]): boolean {
  return hasMedicalReviewerRole(roles) && !hasAdminRole(roles);
}

export function adminHomePath(roles: readonly string[]): string {
  return isMedicalReviewerOnly(roles) ? CONTENT_HOME_PATH : ADMIN_HOME_PATH;
}

export function canSeeAdminSection(
  roles: readonly string[],
  sectionPath: string,
): boolean {
  if (!isMedicalReviewerOnly(roles)) return true;
  return sectionPath === CONTENT_HOME_PATH;
}
