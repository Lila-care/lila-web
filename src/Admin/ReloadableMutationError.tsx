import type { LearnErrorCode } from "@/api/learn";
import { MutationErrorAlert } from "@/Admin/ContentStateViews";
import type { ContentMutationError } from "@/Admin/useContentMutation";
import { SECONDARY_BUTTON } from "@/Admin/contentUi";

// Errors that mean "what you're looking at is stale" — the fix is to reload, not to retry.
const STALE_STATE_CODES: readonly LearnErrorCode[] = [
  "CONCURRENT_MODIFICATION",
  "SLUG_LOCKED",
  "INVALID_TRANSITION",
  "APPROVAL_VERSION_MISMATCH",
];

export function ReloadableMutationError({
  error,
  onReload,
}: {
  error: ContentMutationError;
  onReload: () => void;
}) {
  const needsReload =
    error.code !== null && STALE_STATE_CODES.includes(error.code);
  return (
    <MutationErrorAlert
      message={error.message}
      action={
        needsReload ? (
          <button
            type="button"
            onClick={onReload}
            className={SECONDARY_BUTTON}
            data-testid="content-reload"
          >
            Recargar
          </button>
        ) : undefined
      }
    />
  );
}
