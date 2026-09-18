import {
  DiscountApiError,
  type CreateDiscountPayload,
  type DiscountDto,
  type DiscountKind,
  type DiscountValueType,
  type UpdateDiscountPayload,
} from "@/api/discounts";
import {
  bogotaDayEndToIso,
  computeDiscountedPrice,
  bogotaDayStartToIso,
  formatCop,
  todayInBogota,
  toBogotaDateInput,
} from "@/Admin/discountFormat";

// The admin types pesos, the BE stores cents.
const CENTS_PER_PESO = 100;
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const DIGITS_ONLY = /^\d+$/;

export interface DiscountFormValues {
  planId: string;
  kind: DiscountKind;
  code: string;
  valueType: DiscountValueType;
  value: string;
  startsDate: string;
  endsDate: string;
}

export type DiscountFormField = keyof DiscountFormValues;
export type DiscountFormErrors = Partial<Record<DiscountFormField, string>>;

// Visual/tab order — used to focus the first invalid field after a failed submit.
export const FIELD_ORDER: DiscountFormField[] = [
  "planId",
  "code",
  "value",
  "startsDate",
  "endsDate",
];

export interface ValidationContext {
  mode: "create" | "edit";
  // null when the plan is not in the loaded list (fixed-vs-price rule is then skipped).
  planPriceInCents: number | null;
  today: string;
}

export function createInitialValues(): DiscountFormValues {
  const today = todayInBogota();
  return {
    planId: "",
    kind: "custom",
    code: "",
    valueType: "percentage",
    value: "",
    startsDate: today,
    endsDate: "",
  };
}

export function valuesFromDiscount(discount: DiscountDto): DiscountFormValues {
  return {
    planId: discount.planId,
    kind: discount.kind,
    // Static codes are internal identifiers — never load them into a form field.
    code: discount.kind === "custom" ? discount.code : "",
    valueType: discount.valueType,
    value: String(
      discount.valueType === "fixed"
        ? discount.value / CENTS_PER_PESO
        : discount.value,
    ),
    startsDate: toBogotaDateInput(discount.startsAt),
    endsDate: toBogotaDateInput(discount.endsAt),
  };
}

function parseWholeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return DIGITS_ONLY.test(trimmed) ? Number(trimmed) : null;
}

function validateValue(
  values: DiscountFormValues,
  planPriceInCents: number | null,
): string | undefined {
  const amount = parseWholeNumber(values.value);
  if (values.valueType === "percentage") {
    return amount === null || amount < 1 || amount > 99
      ? "Ingresa un porcentaje entero entre 1 y 99."
      : undefined;
  }
  if (amount === null || amount < 1) return "Ingresa un monto mayor a $0.";
  if (
    planPriceInCents !== null &&
    amount * CENTS_PER_PESO >= planPriceInCents
  ) {
    return `El descuento debe ser menor al precio del plan (${formatCop(planPriceInCents)}).`;
  }
  return undefined;
}

// Discounted price for the informative preview; null while the plan or value is not usable.
export function getPreviewPrice(
  values: DiscountFormValues,
  planPriceInCents: number | null,
): number | null {
  if (planPriceInCents === null || validateValue(values, planPriceInCents)) {
    return null;
  }
  const amount = Number(values.value.trim());
  return computeDiscountedPrice(
    planPriceInCents,
    values.valueType,
    values.valueType === "fixed" ? amount * CENTS_PER_PESO : amount,
  );
}

export function validateDiscountForm(
  values: DiscountFormValues,
  context: ValidationContext,
): DiscountFormErrors {
  const errors: DiscountFormErrors = {};

  if (context.mode === "create") {
    if (!values.planId) errors.planId = "Selecciona un plan.";
    if (values.kind === "custom") {
      if (!values.code.trim()) errors.code = "Ingresa un código.";
      else if (!CODE_PATTERN.test(values.code.trim())) {
        errors.code =
          "Usa entre 3 y 32 caracteres: letras, números, guion (-) o guion bajo (_).";
      }
    }
  }

  const valueError = validateValue(values, context.planPriceInCents);
  if (valueError) errors.value = valueError;

  if (!values.startsDate) errors.startsDate = "Elige una fecha.";
  if (!values.endsDate) errors.endsDate = "Elige una fecha.";
  else if (values.startsDate && values.endsDate < values.startsDate) {
    errors.endsDate = "La fecha de fin no puede ser anterior a la de inicio.";
  } else if (context.mode === "create" && values.endsDate < context.today) {
    errors.endsDate = "La fecha de fin ya pasó.";
  }

  return errors;
}

function toBackendValue(values: DiscountFormValues): number {
  const amount = Number(values.value.trim());
  return values.valueType === "fixed" ? amount * CENTS_PER_PESO : amount;
}

export function buildCreatePayload(
  values: DiscountFormValues,
): CreateDiscountPayload {
  return {
    planId: values.planId,
    kind: values.kind,
    ...(values.kind === "custom" ? { code: values.code.trim() } : {}),
    valueType: values.valueType,
    value: toBackendValue(values),
    startsAt: bogotaDayStartToIso(values.startsDate),
    endsAt: bogotaDayEndToIso(values.endsDate),
  };
}

// PATCH only what changed: re-sending an untouched `startsAt` would rewrite it to 00:00 Bogotá.
export function buildPatchPayload(
  values: DiscountFormValues,
  original: DiscountDto,
): UpdateDiscountPayload {
  const initial = valuesFromDiscount(original);
  const payload: UpdateDiscountPayload = {};
  if (values.valueType !== initial.valueType) {
    payload.valueType = values.valueType;
  }
  if (values.value !== initial.value || payload.valueType) {
    payload.value = toBackendValue(values);
  }
  if (values.startsDate !== initial.startsDate) {
    payload.startsAt = bogotaDayStartToIso(values.startsDate);
  }
  if (values.endsDate !== initial.endsDate) {
    payload.endsAt = bogotaDayEndToIso(values.endsDate);
  }
  return payload;
}

// --- Backend error interpretation ---

export interface ServerErrorOutcome {
  fieldErrors: DiscountFormErrors;
  summary: string[];
}

const OVERLAP_SUMMARY =
  "Ya hay un descuento automático en este plan con fechas que se cruzan con estas. Ajusta la vigencia o desactiva el otro descuento primero.";

// The BE answers 409 for two different causes without saying which; the cause is deducible from
// the request: a duplicate code can only happen when creating a custom discount, and code/kind
// are immutable afterwards, so any other 409 is an overlapping static discount.
export function interpretServerError(
  error: unknown,
  values: DiscountFormValues,
  mode: "create" | "edit",
): ServerErrorOutcome {
  if (!(error instanceof DiscountApiError)) {
    return { fieldErrors: {}, summary: [GENERIC_SAVE_ERROR] };
  }
  if (error.status === 409) {
    if (mode === "create" && values.kind === "custom") {
      return {
        fieldErrors: {
          code: `Ya existe un descuento con el código ${values.code.trim().toUpperCase()}. Elige otro.`,
        },
        summary: [],
      };
    }
    return {
      fieldErrors: {
        startsDate: "Las fechas se cruzan con otro descuento.",
        endsDate: "Las fechas se cruzan con otro descuento.",
      },
      summary: [OVERLAP_SUMMARY],
    };
  }
  if (error.status === 400 && error.messages.length > 0) {
    return { fieldErrors: {}, summary: error.messages };
  }
  if (error.status === 404) {
    return {
      fieldErrors: {},
      summary: [
        "El plan ya no existe. Cierra este formulario y recarga la lista.",
      ],
    };
  }
  return { fieldErrors: {}, summary: [GENERIC_SAVE_ERROR] };
}

const GENERIC_SAVE_ERROR =
  "No se pudo guardar el descuento. Inténtalo de nuevo.";

export const OVERLAP_ACTIVATE_ERROR =
  "No se pudo activar: ya hay otro descuento automático en este plan con fechas que se cruzan con este.";
