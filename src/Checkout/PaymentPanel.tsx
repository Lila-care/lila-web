import type { RefObject } from "react";
import { Lock } from "lucide-react";
import { Banner, Card } from "@lila-care/design-system";
import { formatCop } from "./formatCop";
import PayButton from "./PayButton";
import type { WidgetScriptStatus } from "./useWompiWidget";
import type { PayStatus, PaymentOutcome } from "./types";

const WITHOUT_CODE_NOTE_ID = "pay-without-code-note";

interface PaymentPanelProps {
  listInCents: number;
  totalInCents: number;
  payStatus: PayStatus;
  widgetStatus: WidgetScriptStatus;
  outcome: PaymentOutcome | null;
  isValidatingCode: boolean;
  // A refused code is still in the field: Pagar charges the shown total WITHOUT it.
  isPayingWithoutCode: boolean;
  payButtonRef: RefObject<HTMLButtonElement>;
  onPay: () => void;
}

interface OutcomeBannerProps {
  outcome: PaymentOutcome | null;
  widgetStatus: WidgetScriptStatus;
}

function OutcomeBanner({ outcome, widgetStatus }: OutcomeBannerProps) {
  if (widgetStatus === "error" || outcome === "widget_unavailable") {
    return (
      <Banner
        variant="error"
        title="No pudimos abrir el formulario de pago"
        message="Inténtalo de nuevo en unos segundos."
      />
    );
  }
  switch (outcome) {
    case "declined":
      return (
        <Banner
          variant="error"
          title="El pago no se completó"
          message="Tu banco rechazó el pago. Prueba con otro medio de pago."
        />
      );
    case "closed":
      return (
        <Banner
          variant="warning"
          message="No completaste el pago. Cuando quieras, vuelve a intentarlo."
        />
      );
    case "quote_failed":
      return (
        <Banner
          variant="error"
          title="No pudimos preparar tu pago"
          message="Inténtalo de nuevo en unos segundos."
        />
      );
    case "total_changed":
      return (
        <Banner
          variant="warning"
          title="El total cambió"
          message="Revisa el monto actualizado y vuelve a pagar."
        />
      );
    default:
      return null;
  }
}

export default function PaymentPanel({
  listInCents,
  totalInCents,
  payStatus,
  widgetStatus,
  outcome,
  isValidatingCode,
  isPayingWithoutCode,
  payButtonRef,
  onPay,
}: PaymentPanelProps) {
  const hasDiscount = totalInCents < listInCents;

  return (
    <Card
      data-testid="payment-panel"
      className="gap-5 rounded-2xl border-border-default bg-surface-default px-6 text-text-primary"
    >
      <h2
        id="payment-heading"
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Lock className="size-4 text-text-secondary" aria-hidden="true" />
        Pago seguro
      </h2>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-text-secondary">Total a pagar</p>
        <p className="flex flex-wrap items-baseline gap-x-3 text-3xl font-bold tabular-nums">
          {hasDiscount && (
            <del className="text-lg font-normal text-text-secondary">
              <span className="sr-only">Precio original: </span>
              {formatCop(listInCents)}
            </del>
          )}
          <span data-testid="payment-total">{formatCop(totalInCents)}</span>
        </p>
      </div>
      <div data-testid="payment-outcome" className="empty:hidden">
        <OutcomeBanner outcome={outcome} widgetStatus={widgetStatus} />
      </div>
      <PayButton
        totalInCents={totalInCents}
        payStatus={payStatus}
        widgetStatus={widgetStatus}
        isValidatingCode={isValidatingCode}
        buttonRef={payButtonRef}
        describedBy={isPayingWithoutCode ? WITHOUT_CODE_NOTE_ID : undefined}
        onPay={onPay}
      />
      {isPayingWithoutCode && (
        <p
          id={WITHOUT_CODE_NOTE_ID}
          data-testid="pay-without-code-note"
          className="-mt-2 text-xs text-text-secondary"
        >
          Se cobrará {formatCop(totalInCents)} sin código
        </p>
      )}
      <p className="text-xs text-text-muted">
        Pagas de forma segura con Wompi
      </p>
    </Card>
  );
}
