import type { LearnPhase, ReviewStatus } from "@/api/learn";
import { LearnApiError } from "@/api/learn";
import { PHASE_INFO } from "@/lib/phaseInfo";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  APPROVED: "Aprobado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export function phaseLabel(phase: LearnPhase): string {
  return phase === "GENERAL" ? "General" : PHASE_INFO[phase].label;
}

const ERROR_MESSAGES: Record<string, string> = {
  SLUG_TAKEN: "Ya existe un artículo con ese slug. Elige otro.",
  SLUG_LOCKED:
    "El slug no se puede cambiar porque el artículo ya fue publicado (la app lo usa como enlace).",
  INVALID_TRANSITION:
    "Esta acción ya no es válida para el estado actual. Recarga para ver la última versión.",
  APPROVAL_VERSION_MISMATCH:
    "Esta versión no tiene aprobación médica. Envíala a revisión de nuevo antes de publicar.",
  NOTES_REQUIRED: "Escribe qué hay que cambiar para pedir cambios.",
  CONCURRENT_MODIFICATION:
    "Alguien más modificó este contenido mientras lo tenías abierto. Recarga para ver la última versión.",
  MISSING_SOURCES: "Agrega al menos una fuente antes de enviar a revisión.",
  MISSING_SEE_DOCTOR_CALLOUT:
    'Agrega un bloque "Consulta a tu médico" antes de enviar a revisión.',
  EMPTY_TITLE: "El título está vacío.",
  EMPTY_SUMMARY: "El resumen está vacío.",
  EMPTY_BODY: "El artículo no tiene contenido.",
  EMPTY_TEXT: "El texto del banner está vacío.",
  INSUFFICIENT_SOURCES:
    "No hay fuentes suficientes en la base de conocimiento para este tema",
  DRAFT_GENERATION_FAILED: "No se pudo generar el borrador, intenta de nuevo",
};

const STATUS_MESSAGES: Record<number, string> = {
  403: "No tienes permisos para esta acción.",
  404: "No encontramos este contenido.",
  502: "No se pudo generar el borrador, intenta de nuevo",
};

export function learnErrorMessage(error: unknown): string {
  if (error instanceof LearnApiError) {
    if (error.code && ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
    return `Algo salió mal (${error.message}). Intenta de nuevo.`;
  }
  return "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(isoDate));
}
