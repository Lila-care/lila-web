/** Kept free of asset imports so Playwright specs can import it. */
export const DELETE_ACCOUNT_EMAIL = "contacto@lilacareapp.com";

export const DELETE_ACCOUNT_MAILTO = `mailto:${DELETE_ACCOUNT_EMAIL}?subject=${encodeURIComponent("Eliminar mi cuenta")}`;

export const DELETED_DATA = [
  "Tu cuenta y tu correo de acceso",
  "Tu perfil",
  "Tus registros de ciclo, síntomas y ánimo",
  "Tu diario y tus conversaciones con Lila",
  "Tu suscripción: deja de renovarse",
];

export const RETAINED_DATA =
  "Si hiciste pagos, conservamos esos registros sin datos que te identifiquen, para cumplir obligaciones contables.";
