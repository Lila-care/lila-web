// Pure rules for what each role can do on a reviewable piece of Learn content (article or
// phase banner). Mirrors the ms-lila guards + review state machine
// (src/learn/learn-admin.controller.ts, src/learn/domain/review-state-machine.ts) so the UI only
// offers actions the API will accept.
//
// Relative, type-only imports on purpose: Playwright specs import this file directly.
import type { ReviewDecision, ReviewStatus, Reviewable } from "../api/learn";
import { hasAdminRole, hasMedicalReviewerRole } from "../lib/adminRoles";

const SUBMITTABLE_STATUSES: readonly ReviewStatus[] = [
  "DRAFT",
  "CHANGES_REQUESTED",
];

// Statuses where a save does not throw away review work: any other status goes back to DRAFT
// on the next edit (version++), so the editor warns before saving.
const EDIT_KEEPS_REVIEW_STATUSES: readonly ReviewStatus[] = [
  "DRAFT",
  "CHANGES_REQUESTED",
];

export interface ContentActions {
  canEdit: boolean;
  canSubmit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
}

// Publishing needs the approval to be for exactly the current version — any edit after the
// approval (version++) invalidates it.
export function isPublishable(item: Reviewable): boolean {
  return (
    item.status === "APPROVED" &&
    item.review?.decision === "approve" &&
    item.review.reviewedVersion === item.version
  );
}

export function getContentActions(
  item: Reviewable,
  roles: readonly string[],
): ContentActions {
  const isAdmin = hasAdminRole(roles);
  return {
    canEdit: isAdmin,
    canSubmit: isAdmin && SUBMITTABLE_STATUSES.includes(item.status),
    canPublish: isAdmin && isPublishable(item),
    canArchive: isAdmin && item.status !== "ARCHIVED",
    canReview: hasMedicalReviewerRole(roles) && item.status === "IN_REVIEW",
  };
}

export function editResetsReview(status: ReviewStatus): boolean {
  return !EDIT_KEEPS_REVIEW_STATUSES.includes(status);
}

// Requesting changes without saying what to change is rejected by the API (NOTES_REQUIRED);
// validate it before the round-trip. Returns the error copy, or null when valid.
export function validateReviewNotes(
  decision: ReviewDecision,
  notes: string,
): string | null {
  if (decision === "request_changes" && notes.trim().length === 0) {
    return "Escribe qué hay que cambiar para pedir cambios.";
  }
  return null;
}
