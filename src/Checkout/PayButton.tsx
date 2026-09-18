import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants, cn } from "@lila-care/design-system";
import { formatCop } from "./formatCop";
import type { WidgetScriptStatus } from "./useWompiWidget";
import type { PayStatus } from "./types";

interface PayButtonProps {
  totalInCents: number;
  payStatus: PayStatus;
  widgetStatus: WidgetScriptStatus;
  isValidatingCode: boolean;
  buttonRef: RefObject<HTMLButtonElement>;
  // Id of the element describing why/what this button will do (e.g. "charged without code").
  describedBy?: string;
  onPay: () => void;
}

interface ButtonState {
  label: string;
  isBusy: boolean;
  isBlocked: boolean;
}

function describeButton({
  totalInCents,
  payStatus,
  widgetStatus,
  isValidatingCode,
}: Omit<PayButtonProps, "buttonRef" | "onPay" | "describedBy">): ButtonState {
  if (isValidatingCode) {
    return { label: "Validando código...", isBusy: true, isBlocked: true };
  }
  if (payStatus === "opening") {
    return { label: "Abriendo pago...", isBusy: true, isBlocked: true };
  }
  if (payStatus === "confirming") {
    return { label: "Confirmando pago...", isBusy: true, isBlocked: true };
  }
  if (payStatus === "widget_open") {
    return {
      label: `Pagar ${formatCop(totalInCents)}`,
      isBusy: false,
      isBlocked: true,
    };
  }
  if (widgetStatus === "error") {
    return { label: "Reintentar", isBusy: false, isBlocked: false };
  }
  return {
    label: `Pagar ${formatCop(totalInCents)}`,
    isBusy: false,
    isBlocked: widgetStatus === "loading",
  };
}

// A native <button> styled with the package's `buttonVariants` (instead of its `Button`):
// the package's Button doesn't forward refs under React 18, and we must move focus back here
// explicitly after Wompi's overlay closes. Blocked states use aria-disabled (not `disabled`)
// so the focused button keeps focus and stays reachable.
export default function PayButton({
  buttonRef,
  describedBy,
  onPay,
  ...state
}: PayButtonProps) {
  const { label, isBusy, isBlocked } = describeButton(state);

  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid="pay-button"
      aria-disabled={isBlocked || undefined}
      aria-busy={isBusy || undefined}
      aria-describedby={describedBy}
      onClick={isBlocked ? undefined : onPay}
      className={cn(
        buttonVariants({ variant: "default", size: "full" }),
        // `outline-none!`: see DiscountCodeField (global unlayered button outline).
        "rounded-2xl! outline-none! aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:scale-100",
      )}
    >
      {isBusy && (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  );
}
