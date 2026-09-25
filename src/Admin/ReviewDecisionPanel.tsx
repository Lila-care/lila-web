import { useState } from "react";
import { Check, Loader2, MessageSquareWarning } from "lucide-react";
import type { ReviewDecision } from "@/api/learn";
import { validateReviewNotes } from "@/Admin/contentPermissions";
import {
  INPUT,
  LABEL,
  SECONDARY_BUTTON,
  SUCCESS_BUTTON,
} from "@/Admin/contentUi";

interface ReviewDecisionPanelProps {
  // Resolves to true when the API accepted the decision.
  onDecide: (decision: ReviewDecision, notes: string) => Promise<boolean>;
  pendingDecision: ReviewDecision | null;
  testIdPrefix: string;
}

// Medical reviewer actions. Notes are optional to approve and mandatory to request changes.
export function ReviewDecisionPanel({
  onDecide,
  pendingDecision,
  testIdPrefix,
}: ReviewDecisionPanelProps) {
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const busy = pendingDecision !== null;
  const notesId = `${testIdPrefix}-review-notes`;

  const decide = async (decision: ReviewDecision) => {
    const validationError = validateReviewNotes(decision, notes);
    setNotesError(validationError);
    if (validationError) return;
    const accepted = await onDecide(decision, notes.trim());
    if (accepted) setNotes("");
  };

  return (
    <div
      className="space-y-3 rounded-[12px] border border-blue-200 bg-blue-50/60 p-4"
      data-testid={`${testIdPrefix}-review-panel`}
    >
      <p className="text-sm font-semibold text-blue-900">Revisión médica</p>
      <div>
        <label htmlFor={notesId} className={LABEL}>
          Notas para el equipo
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            if (notesError) setNotesError(null);
          }}
          maxLength={4000}
          rows={3}
          disabled={busy}
          aria-invalid={notesError !== null}
          aria-describedby={notesError ? `${notesId}-error` : undefined}
          className={INPUT}
          placeholder="Obligatorio si pides cambios: qué hay que corregir y por qué."
          data-testid={`${testIdPrefix}-review-notes`}
        />
        {notesError && (
          <p
            id={`${notesId}-error`}
            className="mt-1 text-sm text-red-600"
            data-testid={`${testIdPrefix}-review-notes-error`}
          >
            {notesError}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={busy}
          className={SUCCESS_BUTTON}
          data-testid={`${testIdPrefix}-approve`}
        >
          {pendingDecision === "approve" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => decide("request_changes")}
          disabled={busy}
          className={SECONDARY_BUTTON}
          data-testid={`${testIdPrefix}-request-changes`}
        >
          {pendingDecision === "request_changes" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquareWarning className="size-4" aria-hidden="true" />
          )}
          Pedir cambios
        </button>
      </div>
    </div>
  );
}
