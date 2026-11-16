import { ApiError } from "@/api/http";
import {
  ALLOWLIST_MAX_USERS,
  type BroadcastResult,
  BODY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type BroadcastPayload,
  type NotificationCategory,
} from "@/api/notifications";

export const CATEGORY_OPTIONS: { value: NotificationCategory; label: string }[] =
  [
    { value: "cycle", label: "Tu ciclo" },
    { value: "periodPredictions", label: "Periodo y predicciones" },
    { value: "dailyReminder", label: "Recordatorio diario" },
    { value: "news", label: "Novedades" },
    { value: "plan", label: "Mi plan y pagos" },
  ];

export function categoryLabel(category: NotificationCategory): string {
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export interface NotificationFormValues {
  title: string;
  body: string;
  category: NotificationCategory;
  // Raw text of the hour input; "" = no hour filter.
  localHour: string;
  // One Cognito sub per line.
  allowlist: string;
}

export const EMPTY_FORM: NotificationFormValues = {
  title: "",
  body: "",
  category: "news",
  localHour: "",
  allowlist: "",
};

// Trimmed, non-empty, de-duplicated, in first-seen order. Commas and spaces also split so a
// pasted list from a spreadsheet works.
export function parseAllowlist(raw: string): string[] {
  const ids = raw
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

export function parseLocalHour(raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^\d{1,2}$/.test(text)) return "invalid";
  const hour = Number(text);
  return hour >= 0 && hour <= 23 ? hour : "invalid";
}

export type FormErrors = Partial<
  Record<"title" | "body" | "localHour" | "allowlist", string>
>;

export function validateForm(values: NotificationFormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `El título admite hasta ${TITLE_MAX_LENGTH} caracteres.`;
  }
  const body = values.body.trim();
  if (!body) errors.body = "Escribí el texto de la notificación.";
  else if (body.length > BODY_MAX_LENGTH) {
    errors.body = `El texto admite hasta ${BODY_MAX_LENGTH} caracteres.`;
  }
  if (parseLocalHour(values.localHour) === "invalid") {
    errors.localHour = "La hora local debe ser un número entre 0 y 23.";
  }
  if (parseAllowlist(values.allowlist).length > ALLOWLIST_MAX_USERS) {
    errors.allowlist = `La lista admite hasta ${ALLOWLIST_MAX_USERS} usuarias.`;
  }
  return errors;
}

// Payload for a (valid) form. `dryRun` is explicit on every call.
export function buildPayload(
  values: NotificationFormValues,
  dryRun: boolean,
): BroadcastPayload {
  const title = values.title.trim();
  const allowlist = parseAllowlist(values.allowlist);
  const localHour = parseLocalHour(values.localHour);
  return {
    ...(title && { title }),
    body: values.body.trim(),
    category: values.category,
    dryRun,
    ...(allowlist.length > 0 && { allowlistUserIds: allowlist }),
    ...(typeof localHour === "number" && { localHour }),
  };
}

// Identifies "the same data": a simulation only unlocks the real send while this still matches
// what is in the form (dryRun excluded on purpose).
export function payloadSignature(values: NotificationFormValues): string {
  const { dryRun: _dryRun, ...rest } = buildPayload(values, true);
  void _dryRun;
  return JSON.stringify(rest);
}

export const ENDPOINT_UNAVAILABLE_NOTICE =
  "El envío de notificaciones todavía no está disponible en este entorno. Probá de nuevo cuando se publique la nueva versión de la API.";

const GENERIC_ERROR = "No pudimos completar la operación. Intentá de nuevo.";

export type BroadcastErrorKind = "unavailable" | "error";

export interface BroadcastError {
  kind: BroadcastErrorKind;
  message: string;
}

// Spanish copy for errors of the broadcast call. The missing-allowlist 400 is mapped; any other
// 400/422 keeps the BE validation text as a detail line after a fixed Spanish lead-in.
export function toBroadcastError(error: unknown): BroadcastError {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: GENERIC_ERROR };
  }
  switch (error.status) {
    case 404:
      return { kind: "unavailable", message: ENDPOINT_UNAVAILABLE_NOTICE };
    case 401:
    case 403:
      return {
        kind: "error",
        message: "No tenés permiso para enviar notificaciones.",
      };
    case 400:
    case 422: {
      const joined = error.messages.join(" ").toLowerCase();
      if (joined.includes("allowlist")) {
        return {
          kind: "error",
          message:
            "El envío real requiere una lista de usuarias permitidas (de 1 a 200).",
        };
      }
      const detail = error.messages.join(" · ");
      return {
        kind: "error",
        message: detail
          ? `Revisá los datos del formulario. Detalle: ${detail}`
          : "Revisá los datos del formulario: alguno no es válido.",
      };
    }
    default:
      return { kind: "error", message: GENERIC_ERROR };
  }
}

// Plain-Spanish reading of a simulation sent to ONE user. `skipped` counts the user left out
// by each rule; with nothing skipped and no device, she simply has no device registered.
export function describeSingleUserReach(result: BroadcastResult): {
  reachable: boolean;
  message: string;
} {
  const { devices } = result.recipients;
  if (devices > 0) {
    return {
      reachable: true,
      message: `Le llegaría en ${devices} ${devices === 1 ? "dispositivo" : "dispositivos"}.`,
    };
  }
  const { skipped } = result;
  if (skipped.categoryOff > 0) {
    return {
      reachable: false,
      message: "No le llegaría: tiene apagada esta categoría de notificaciones.",
    };
  }
  if (skipped.quietHours > 0) {
    return {
      reachable: false,
      message: "No le llegaría ahora: está en su horario de silencio.",
    };
  }
  return {
    reachable: false,
    message: "Esta usuaria aún no tiene un dispositivo registrado.",
  };
}
