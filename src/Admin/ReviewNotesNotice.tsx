import { MessageSquareWarning } from "lucide-react";

// What the medical reviewer asked to change — shown while the content is CHANGES_REQUESTED.
export function ReviewNotesNotice({ notes }: { notes: string }) {
  return (
    <div
      className="flex gap-3 rounded-[10px] border border-amber-300 bg-amber-50 p-3 text-amber-900"
      data-testid="review-notes-notice"
      role="note"
    >
      <MessageSquareWarning
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">La revisora pidió cambios</p>
        <p className="mt-1 whitespace-pre-line break-words text-sm">{notes}</p>
      </div>
    </div>
  );
}
