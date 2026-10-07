import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Dialog } from "radix-ui";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import { Reduction } from "@/Admin/plans/entitlementsReductions";

export type ConfirmPhase = "confirm" | "saving" | "error" | "success";

interface ConfirmChangeDialogProps {
  planName: string;
  subscriberCount: number;
  reductions: Reduction[];
  phase: ConfirmPhase;
  onConfirm: () => void;
  onCancel: () => void;
  onDone: () => void;
}

function describeImpact(count: number, planName: string): string {
  const who = count === 1 ? "1 suscriptora" : `${count} suscriptoras`;
  return `Este cambio afecta a ${who} de ${planName} y aplica de inmediato.`;
}

function ReductionList({ reductions }: { reductions: Reduction[] }) {
  return (
    <ul className="flex flex-col" data-testid="confirm-reductions">
      {reductions.map((item) => (
        <li
          key={item.key}
          className="flex flex-col gap-1 border-b border-border-default py-3"
          data-testid={`confirm-reduction-${item.key}`}
        >
          <span className="type-body-md-strong text-text-primary">
            {item.label}
          </span>
          <span className="type-body-md grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-text-secondary">
            <span>{item.before}</span>
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
            <span className="type-body-md-strong text-text-primary">
              {item.after}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Notice({
  tone,
  title,
  children,
  testId,
}: {
  tone: "error" | "success";
  title: string;
  children: string;
  testId: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-destructive/40 bg-destructive/10"
      : "border-teal-500/50 bg-teal-500/10";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex flex-col gap-1 border p-4 ${toneClass}`}
      data-testid={testId}
    >
      <p className="type-body-md-strong text-text-primary">{title}</p>
      <p className="type-body-sm text-text-secondary">{children}</p>
    </div>
  );
}

function DialogActions({
  phase,
  onConfirm,
  onCancel,
  onDone,
}: Pick<
  ConfirmChangeDialogProps,
  "phase" | "onConfirm" | "onCancel" | "onDone"
>) {
  const buttons: ReactNode =
    phase === "success" ? (
      <LedgerButton tone="secondary" onClick={onDone} data-testid="confirm-done">
        Cerrar
      </LedgerButton>
    ) : (
      <>
        <LedgerButton
          tone="secondary"
          onClick={onCancel}
          disabled={phase === "saving"}
          data-testid="confirm-cancel"
        >
          Cancelar
        </LedgerButton>
        <LedgerButton
          onClick={onConfirm}
          disabled={phase === "saving"}
          data-testid="confirm-accept"
        >
          {phase === "saving"
            ? "Guardando…"
            : phase === "error"
              ? "Reintentar"
              : "Confirmar cambio"}
        </LedgerButton>
      </>
    );
  return <div className="flex flex-wrap justify-end gap-3">{buttons}</div>;
}

// "Confirmar cambio": shown when saving a plan that has subscribers would take access away.
// Nested radix Dialog over the plan panel (focus trap, aria-modal, Esc = Cancelar while idle).
export function ConfirmChangeDialog(props: ConfirmChangeDialogProps) {
  const { planName, subscriberCount, reductions, phase, onCancel } = props;
  const busy = phase === "saving";
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-60 bg-overlay-scrim"
          data-testid="confirm-scrim"
        />
        <Dialog.Content
          aria-describedby="confirm-impact"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (!busy && phase !== "success") onCancel();
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 z-60 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-140 -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto border border-border-default bg-card p-6 focus:outline-none md:p-8"
          data-testid="confirm-dialog"
        >
          <Dialog.Title className="type-h3 text-text-primary">
            {phase === "success" ? "Cambios aplicados" : "Confirmar cambio"}
          </Dialog.Title>
          <p id="confirm-impact" className="type-body-md text-text-primary">
            {describeImpact(subscriberCount, planName)}
          </p>
          <ReductionList reductions={reductions} />
          {phase === "error" && (
            <Notice tone="error" title="No se pudo guardar el plan" testId="confirm-error">
              No se aplicaron los cambios. La configuración anterior sigue vigente. Se puede reintentar.
            </Notice>
          )}
          {phase === "success" && (
            <Notice tone="success" title="Plan guardado" testId="confirm-success">
              {`${reductions.length === 1 ? "El cambio se aplicó" : `Los ${reductions.length} cambios se aplicaron`} de inmediato.`}
            </Notice>
          )}
          <DialogActions {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
