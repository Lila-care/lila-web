import { useState } from "react";
import AdminLayout from "@/Admin/AdminLayout";
import { FIELD_CONTROL_CLASS, FormField } from "@/Admin/ledger/FormField";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import {
  ConfirmSendDialog,
  SendOutcome,
  SimulationSummary,
} from "@/Admin/NotificationsParts";
import { useBroadcast } from "@/Admin/useBroadcast";
import {
  ALLOWLIST_MAX_USERS,
  BODY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type NotificationCategory,
} from "@/api/notifications";
import {
  CATEGORY_OPTIONS,
  EMPTY_FORM,
  ENDPOINT_UNAVAILABLE_NOTICE,
  parseAllowlist,
  payloadSignature,
  validateForm,
  type FormErrors,
  type NotificationFormValues,
} from "@/Admin/notificationsFormat";

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="type-caption text-destructive">
      {message}
    </p>
  );
}

function counterText(length: number, max: number) {
  return `${length}/${max}`;
}

interface FormFieldsProps {
  values: NotificationFormValues;
  errors: FormErrors;
  disabled: boolean;
  onChange: (patch: Partial<NotificationFormValues>) => void;
}

function FormFields({ values, errors, disabled, onChange }: FormFieldsProps) {
  const allowlistCount = parseAllowlist(values.allowlist).length;
  return (
    <div className="flex flex-col gap-5">
      <FormField
        label="Título (opcional)"
        htmlFor="notif-title"
        hint={counterText(values.title.length, TITLE_MAX_LENGTH)}
      >
        <input
          id="notif-title"
          type="text"
          value={values.title}
          maxLength={TITLE_MAX_LENGTH}
          disabled={disabled}
          onChange={(e) => onChange({ title: e.target.value })}
          className={FIELD_CONTROL_CLASS}
          data-testid="notif-title"
        />
        <FieldError message={errors.title} id="notif-title-error" />
      </FormField>

      <FormField
        label="Texto"
        htmlFor="notif-body"
        hint={counterText(values.body.length, BODY_MAX_LENGTH)}
      >
        <textarea
          id="notif-body"
          rows={3}
          value={values.body}
          maxLength={BODY_MAX_LENGTH}
          disabled={disabled}
          onChange={(e) => onChange({ body: e.target.value })}
          className={FIELD_CONTROL_CLASS}
          data-testid="notif-body"
        />
        <FieldError message={errors.body} id="notif-body-error" />
      </FormField>

      <FormField label="Categoría" htmlFor="notif-category">
        <select
          id="notif-category"
          value={values.category}
          disabled={disabled}
          onChange={(e) =>
            onChange({ category: e.target.value as NotificationCategory })
          }
          className={FIELD_CONTROL_CLASS}
          data-testid="notif-category"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Hora local (opcional)"
        htmlFor="notif-local-hour"
        hint="De 0 a 23. Solo recibe quien tenga esa hora en su zona horaria."
      >
        <input
          id="notif-local-hour"
          type="text"
          inputMode="numeric"
          value={values.localHour}
          disabled={disabled}
          onChange={(e) => onChange({ localHour: e.target.value })}
          className={FIELD_CONTROL_CLASS}
          data-testid="notif-local-hour"
        />
        <FieldError message={errors.localHour} id="notif-local-hour-error" />
      </FormField>

      <FormField
        label="Usuarias permitidas (una por línea)"
        htmlFor="notif-allowlist"
        hint={`${allowlistCount}/${ALLOWLIST_MAX_USERS} · IDs de usuaria (sub). Obligatoria para el envío real.`}
      >
        <textarea
          id="notif-allowlist"
          rows={5}
          value={values.allowlist}
          disabled={disabled}
          onChange={(e) => onChange({ allowlist: e.target.value })}
          className={`${FIELD_CONTROL_CLASS} font-mono`}
          data-testid="notif-allowlist"
        />
        <FieldError message={errors.allowlist} id="notif-allowlist-error" />
      </FormField>
    </div>
  );
}

function sendBlockedReason(
  hasSimulation: boolean,
  inSync: boolean,
  hasAllowlist: boolean,
  devices: number,
): string | null {
  if (!hasSimulation) return "Simulá primero para poder enviar.";
  if (!inSync) return "Cambiaste los datos: volvé a simular para poder enviar.";
  if (!hasAllowlist) {
    return "El envío real requiere una lista de usuarias permitidas.";
  }
  if (devices === 0) return "La simulación no alcanza ningún dispositivo.";
  return null;
}

function NotificationsPage() {
  const [values, setValues] = useState<NotificationFormValues>(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);
  const broadcast = useBroadcast();

  const errors = validateForm(values);
  const formValid = Object.keys(errors).length === 0;
  const { simulation } = broadcast;
  const inSync =
    simulation !== null && simulation.signature === payloadSignature(values);
  const hasAllowlist = parseAllowlist(values.allowlist).length > 0;
  const devices = simulation?.result.recipients.devices ?? 0;
  const blockedReason = sendBlockedReason(
    simulation !== null,
    inSync,
    hasAllowlist,
    devices,
  );
  const busy = broadcast.busy !== null;
  const canSend = blockedReason === null && formValid && !busy;

  const change = (patch: Partial<NotificationFormValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  const confirmSend = async () => {
    await broadcast.send(values);
    setConfirming(false);
  };

  return (
    <AdminLayout>
      <div
        className="flex min-h-full flex-col gap-6 px-5 py-6 md:px-8 md:pt-8 md:pb-10 lg:pt-10 lg:pr-10 lg:pb-16 lg:pl-16"
        data-testid="notifications-page"
      >
        <header className="flex flex-col gap-1">
          <h1 className="type-h2 md:type-h1 text-text-primary">
            Notificaciones
          </h1>
          <p className="type-body-sm text-text-secondary">
            Simulá el alcance de una notificación y, solo después, enviala a
            una lista de usuarias de prueba.
          </p>
        </header>

        {broadcast.unavailable && (
          <p
            role="status"
            className="type-body-md rounded-md border border-border-strong p-3 text-text-primary"
            data-testid="notifications-unavailable"
          >
            {ENDPOINT_UNAVAILABLE_NOTICE}
          </p>
        )}

        <div className="grid min-w-0 gap-10 lg:grid-cols-2">
          <form
            className="flex max-w-xl flex-col gap-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (formValid && !busy) void broadcast.simulate(values);
            }}
            data-testid="notifications-form"
          >
            <FormFields
              values={values}
              errors={errors}
              disabled={busy}
              onChange={change}
            />

            {broadcast.error && broadcast.error.kind === "error" && (
              <p
                role="alert"
                className="type-body-sm break-words text-destructive"
                data-testid="notifications-error"
              >
                {broadcast.error.message}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <LedgerButton
                  type="submit"
                  disabled={!formValid || busy}
                  data-testid="notifications-simulate"
                >
                  {broadcast.busy === "simulating"
                    ? "Simulando..."
                    : "Simular envío"}
                </LedgerButton>
                <LedgerButton
                  tone="secondary"
                  disabled={!canSend}
                  onClick={() => setConfirming(true)}
                  data-testid="notifications-send"
                >
                  Enviar de verdad
                </LedgerButton>
              </div>
              {blockedReason && (
                <p
                  className="type-caption text-text-secondary"
                  data-testid="notifications-send-hint"
                >
                  {blockedReason}
                </p>
              )}
            </div>
          </form>

          <div className="flex min-w-0 flex-col gap-8">
            {simulation && (
              <SimulationSummary result={simulation.result} stale={!inSync} />
            )}
            {broadcast.sendResult && <SendOutcome result={broadcast.sendResult} />}
          </div>
        </div>
      </div>

      {confirming && simulation && (
        <ConfirmSendDialog
          values={values}
          devices={devices}
          users={simulation.result.recipients.users}
          sending={broadcast.busy === "sending"}
          onConfirm={() => void confirmSend()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </AdminLayout>
  );
}

export default NotificationsPage;
