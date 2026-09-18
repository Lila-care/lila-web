import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card } from "@lila-care/design-system";
import { formatCop } from "./formatCop";
import type { PaymentResult as PaymentResultState } from "./types";

interface PaymentResultProps {
  result: PaymentResultState;
  planName: string;
  isConfirming: boolean;
  onRetryConfirmation: () => void;
}

interface ResultCopy {
  Icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
}

function describeResult(
  result: PaymentResultState,
  planName: string,
): ResultCopy {
  switch (result.kind) {
    case "approved":
      return {
        Icon: CheckCircle2,
        iconClassName: "text-feedback-success-text",
        title: `¡Listo! Ya tienes ${planName}`,
        description: "Tu pago fue aprobado y tu plan ya está activo.",
      };
    case "pending":
      return {
        Icon: Loader2,
        iconClassName:
          "text-brand-primary animate-spin motion-reduce:animate-none",
        title: "Estamos confirmando tu pago",
        description:
          "Tu plan se activará cuando se confirme el pago.",
      };
    case "confirm_failed":
      return {
        Icon: AlertCircle,
        iconClassName: "text-feedback-error-text",
        title: "Recibimos tu pago, pero no pudimos activar tu plan",
        description:
          "Reintenta la confirmación. Si el problema sigue, escríbenos con esta referencia y lo resolvemos.",
      };
  }
}

// Replaces both columns once the purchase reached a terminal state. It owns the page H1.
export default function PaymentResult({
  result,
  planName,
  isConfirming,
  onRetryConfirmation,
}: PaymentResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { Icon, iconClassName, title, description } = describeResult(
    result,
    planName,
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [result.kind]);

  return (
    <Card
      data-testid={`payment-result-${result.kind}`}
      className="mx-auto max-w-lg items-center gap-5 rounded-2xl border-border-default bg-surface-default px-6 text-center text-text-primary"
    >
      <Icon className={`size-12 ${iconClassName}`} aria-hidden="true" />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-bold outline-none md:text-[28px]"
      >
        {title}
      </h1>
      <p className="text-sm text-text-secondary">{description}</p>
      <dl className="flex w-full flex-col gap-2 rounded-[12px] bg-surface-subtle p-4 text-left text-sm">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-text-secondary">Total pagado</dt>
          <dd className="tabular-nums">{formatCop(result.amountInCents)}</dd>
        </div>
        {result.code && (
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-text-secondary">Código aplicado</dt>
            <dd>{result.code}</dd>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-text-secondary">Referencia</dt>
          <dd className="min-w-0 break-all">{result.transactionId}</dd>
        </div>
      </dl>
      {result.kind === "confirm_failed" ? (
        <Button
          size="lg"
          className="h-12 rounded-[12px]!"
          aria-disabled={isConfirming || undefined}
          onClick={isConfirming ? undefined : onRetryConfirmation}
        >
          {isConfirming ? "Confirmando..." : "Reintentar confirmación"}
        </Button>
      ) : (
        <Button asChild size="lg" className="h-12 rounded-[12px]!">
          <Link href="/chat">Ir al chat</Link>
        </Button>
      )}
    </Card>
  );
}
