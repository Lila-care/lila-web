import { Dialog } from "radix-ui";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import type { BroadcastResult } from "@/api/notifications";
import {
  categoryLabel,
  type NotificationFormValues,
} from "@/Admin/notificationsFormat";

interface ReachRowProps {
  label: string;
  value: number;
  testId: string;
}

function ReachRow({ label, value, testId }: ReachRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-default py-2">
      <dt className="type-body-md text-text-secondary">{label}</dt>
      <dd className="type-body-md-strong text-text-primary" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

interface SimulationSummaryProps {
  result: BroadcastResult;
  stale: boolean;
}

// Dry-run reach: who would get it and who is left out, and why.
export function SimulationSummary({ result, stale }: SimulationSummaryProps) {
  const { recipients, skipped } = result;
  return (
    <section
      aria-labelledby="notifications-simulation-title"
      className="flex flex-col gap-2"
      data-testid="notifications-simulation"
    >
      <h2 id="notifications-simulation-title" className="type-h3 text-text-primary">
        Resultado de la simulación
      </h2>
      {stale && (
        <p
          className="type-body-sm text-text-secondary"
          data-testid="notifications-simulation-stale"
        >
          Cambiaste los datos después de simular. Volvé a simular para poder
          enviar.
        </p>
      )}
      <dl>
        <ReachRow
          label="Usuarias alcanzadas"
          value={recipients.users}
          testId="sim-users"
        />
        <ReachRow
          label="Dispositivos alcanzados"
          value={recipients.devices}
          testId="sim-devices"
        />
        <ReachRow
          label="Omitidas por categoría desactivada"
          value={skipped.categoryOff}
          testId="sim-category-off"
        />
        <ReachRow
          label="Omitidas por horario de silencio"
          value={skipped.quietHours}
          testId="sim-quiet-hours"
        />
        <ReachRow
          label="Omitidas por hora local"
          value={skipped.notLocalHour}
          testId="sim-not-local-hour"
        />
        <ReachRow
          label="Total omitidas"
          value={skipped.total}
          testId="sim-skipped-total"
        />
      </dl>
    </section>
  );
}

// Outcome of a real send.
export function SendOutcome({ result }: { result: BroadcastResult }) {
  return (
    <section
      aria-labelledby="notifications-outcome-title"
      className="flex flex-col gap-2"
      data-testid="notifications-outcome"
    >
      <h2 id="notifications-outcome-title" className="type-h3 text-text-primary">
        Envío realizado
      </h2>
      {result.aborted && (
        <p role="alert" className="type-body-sm text-destructive">
          El envío se interrumpió antes de terminar. Revisá los números antes
          de volver a intentarlo.
        </p>
      )}
      <dl>
        <ReachRow label="Enviadas" value={result.sent} testId="out-sent" />
        <ReachRow label="Fallidas" value={result.failed} testId="out-failed" />
        <ReachRow
          label="Dispositivos dados de baja"
          value={result.removed}
          testId="out-removed"
        />
      </dl>
    </section>
  );
}

interface ConfirmSendDialogProps {
  values: NotificationFormValues;
  devices: number;
  users: number;
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Last gate before a real send: repeats exactly what will go out and to how many devices.
export function ConfirmSendDialog({
  values,
  devices,
  users,
  sending,
  onConfirm,
  onCancel,
}: ConfirmSendDialogProps) {
  const title = values.title.trim();
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !sending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay-scrim" />
        <Dialog.Content
          aria-describedby="notifications-confirm-desc"
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border border-border-default bg-card p-6 focus:outline-none"
          data-testid="notifications-confirm-dialog"
        >
          <Dialog.Title className="type-h3 text-text-primary">
            ¿Enviar de verdad?
          </Dialog.Title>
          <div id="notifications-confirm-desc" className="flex flex-col gap-3">
            <p className="type-body-md text-text-primary">
              Se enviará a{" "}
              <strong data-testid="confirm-devices">
                {devices} {devices === 1 ? "dispositivo" : "dispositivos"}
              </strong>{" "}
              ({users} {users === 1 ? "usuaria" : "usuarias"}). No se puede
              deshacer.
            </p>
            <div
              className="flex flex-col gap-1 rounded-md border border-border-default p-3"
              data-testid="confirm-preview"
            >
              <span className="type-caption text-text-secondary">
                {categoryLabel(values.category)}
              </span>
              {title && (
                <span className="type-body-md-strong text-text-primary">
                  {title}
                </span>
              )}
              <span className="type-body-md break-words text-text-primary">
                {values.body.trim()}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <LedgerButton
              tone="secondary"
              onClick={onCancel}
              disabled={sending}
              data-testid="confirm-cancel"
            >
              Cancelar
            </LedgerButton>
            <LedgerButton
              onClick={onConfirm}
              disabled={sending}
              data-testid="confirm-send"
            >
              {sending ? "Enviando..." : "Sí, enviar"}
            </LedgerButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
