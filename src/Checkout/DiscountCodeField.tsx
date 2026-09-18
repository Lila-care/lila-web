import type { KeyboardEvent, RefObject } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants, cn } from "@lila-care/design-system";
import { TONE_BORDER, TONE_TEXT, describeFeedback } from "./codeFeedback";
import type { AppliedDiscount, CodeFieldStatus } from "./types";

interface DiscountCodeFieldProps {
  value: string;
  status: CodeFieldStatus;
  applied: AppliedDiscount | null;
  // A quote/payment is in flight: the code can't change under it.
  isLocked: boolean;
  inputRef: RefObject<HTMLInputElement>;
  actionButtonRef: RefObject<HTMLButtonElement>;
  onChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

const FEEDBACK_ID = "discount-code-feedback";

export default function DiscountCodeField({
  value,
  status,
  applied,
  isLocked,
  inputRef,
  actionButtonRef,
  onChange,
  onApply,
  onRemove,
}: DiscountCodeFieldProps) {
  const feedback = describeFeedback(status, applied);
  const isValidating = status === "validating";
  const isApplied = status === "valid";
  const isBlocked = isValidating || isLocked;
  const hasError = feedback !== null && feedback.tone !== "success";
  const isEmpty = value.trim() === "";

  // Explicit Enter handler: relying on the browser's implicit form submission is unreliable in
  // this app (see e2e/chat-composer.spec.ts).
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onApply();
  };

  return (
    <form
      noValidate
      aria-busy={isBlocked}
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="flex flex-col gap-2"
    >
      <label
        htmlFor="discount-code"
        className="text-xs font-medium text-text-primary"
      >
        Código de descuento
      </label>
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id="discount-code"
            name="discountCode"
            type="text"
            value={value}
            placeholder="Ej. LILA20"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            // readOnly (not disabled) while validating/applied/locked: keeps focus and value.
            readOnly={isBlocked || isApplied}
            aria-invalid={hasError || undefined}
            aria-describedby={feedback ? FEEDBACK_ID : undefined}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "h-12 w-full min-w-0 rounded-[12px] border border-border bg-surface-default px-4 pr-11 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-[3px] focus-visible:ring-ring/70 read-only:cursor-default",
              isValidating && "cursor-progress",
              feedback && TONE_BORDER[feedback.tone],
            )}
          />
          {feedback && (
            <feedback.Icon
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2",
                TONE_TEXT[feedback.tone],
              )}
            />
          )}
        </div>
        <button
          ref={actionButtonRef}
          type={isApplied ? "button" : "submit"}
          disabled={isEmpty && !isApplied}
          // aria-disabled (not disabled) while validating/locked so a focused button keeps focus.
          aria-disabled={isBlocked || undefined}
          onClick={isApplied && !isBlocked ? onRemove : undefined}
          data-testid="code-action"
          className={cn(
            buttonVariants({
              variant: isApplied ? "ghost" : "secondary",
              size: "lg",
            }),
            // `outline-none!`: the app's global `button:focus-visible` outline is unlayered and
            // would stack a second (UA) focus ring on top of the DS ring. Ghost hover uses the
            // Chat-family tokens: the DS default (accent) is amber, off this screen's palette.
            "h-12 shrink-0 rounded-[12px]! outline-none! aria-disabled:cursor-progress aria-disabled:opacity-70",
            isApplied && "hover:bg-surface-muted! hover:text-brand-primary",
          )}
        >
          {isValidating && (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {isValidating ? "Validando..." : isApplied ? "Quitar" : "Aplicar"}
        </button>
      </div>
      {feedback && (
        <p
          id={FEEDBACK_ID}
          data-testid="code-feedback"
          data-status={status}
          className={cn(
            "flex items-start gap-2 text-xs",
            TONE_TEXT[feedback.tone],
          )}
        >
          <feedback.Icon
            data-testid={`code-feedback-icon-${status}`}
            aria-hidden="true"
            className="mt-px size-4 shrink-0"
          />
          <span className="min-w-0">{feedback.message}</span>
        </p>
      )}
    </form>
  );
}
