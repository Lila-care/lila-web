import { useState } from "react";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import {
  ConfirmSendDialog,
  NotificationMessageFields,
} from "@/Admin/NotificationsParts";
import { useBroadcast } from "@/Admin/useBroadcast";
import {
  EMPTY_FORM,
  ENDPOINT_UNAVAILABLE_NOTICE,
  describeSingleUserReach,
  payloadSignature,
  validateForm,
  type NotificationFormValues,
} from "@/Admin/notificationsFormat";

interface UserNotificationSenderProps {
  // Cognito sub of the open user: the one-element allowlist of every call.
  userId: string;
  email: string | undefined;
}

// "Enviar notificación" section of the user detail panel: same simulate → confirm → send flow
// as the Notificaciones screen, aimed at a single user. The owner renders it with
// `key={userId}` so switching user starts from a blank form and no stale simulation.
export function UserNotificationSender({
  userId,
  email,
}: UserNotificationSenderProps) {
  const [fields, setFields] = useState<NotificationFormValues>(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);
  const broadcast = useBroadcast();

  const values: NotificationFormValues = { ...fields, allowlist: userId };
  const errors = validateForm(values);
  const formValid = Object.keys(errors).length === 0;
  const { simulation } = broadcast;
  const inSync =
    simulation !== null && simulation.signature === payloadSignature(values);
  const reach = simulation
    ? describeSingleUserReach(simulation.result)
    : null;
  const busy = broadcast.busy !== null;
  const canSend = inSync && reach?.reachable === true && formValid && !busy;
  const recipient = email ?? "esta usuaria";

  const confirmSend = async () => {
    await broadcast.send(values);
    setConfirming(false);
  };

  return (
    <section
      aria-labelledby="user-panel-notify"
      className="flex flex-col gap-4 border-t border-border-default pt-6"
      data-testid="user-notify"
    >
      <h3
        id="user-panel-notify"
        className="type-body-md-strong text-text-primary"
      >
        Enviar notificación
      </h3>

      {broadcast.unavailable && (
        <p
          role="status"
          className="type-body-sm text-text-primary"
          data-testid="user-notify-unavailable"
        >
          {ENDPOINT_UNAVAILABLE_NOTICE}
        </p>
      )}

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (formValid && !busy) void broadcast.simulate(values);
        }}
      >
        <NotificationMessageFields
          idPrefix="user-notify"
          values={fields}
          errors={errors}
          disabled={busy}
          onChange={(patch) => setFields((c) => ({ ...c, ...patch }))}
        />

        {broadcast.error?.kind === "error" && (
          <p
            role="alert"
            className="type-body-sm break-words text-destructive"
            data-testid="user-notify-error"
          >
            {broadcast.error.message}
          </p>
        )}

        {reach && (
          <p
            role="status"
            className="type-body-md text-text-primary"
            data-testid="user-notify-reach"
          >
            {inSync
              ? reach.message
              : "Cambiaste los datos: volvé a simular para poder enviar."}
          </p>
        )}

        {broadcast.sendResult && (
          <p
            role="status"
            className="type-body-md text-text-primary"
            data-testid="user-notify-outcome"
          >
            {broadcast.sendResult.aborted
              ? "El envío se interrumpió antes de terminar. "
              : ""}
            Enviadas: {broadcast.sendResult.sent} · Fallidas:{" "}
            {broadcast.sendResult.failed}
            {broadcast.sendResult.removed > 0 &&
              ` · Dispositivos dados de baja: ${broadcast.sendResult.removed}`}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <LedgerButton
            type="submit"
            disabled={!formValid || busy}
            data-testid="user-notify-simulate"
          >
            {broadcast.busy === "simulating" ? "Simulando..." : "Simular envío"}
          </LedgerButton>
          <LedgerButton
            tone="secondary"
            disabled={!canSend}
            onClick={() => setConfirming(true)}
            data-testid="user-notify-send"
          >
            Enviar a esta usuaria
          </LedgerButton>
        </div>
      </form>

      {confirming && simulation && (
        <ConfirmSendDialog
          values={values}
          devices={simulation.result.recipients.devices}
          users={1}
          recipientLabel={recipient}
          sending={broadcast.busy === "sending"}
          onConfirm={() => void confirmSend()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
