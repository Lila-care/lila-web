import checkIcon from "../assets/landing/icon-check.svg";
import mockupFeatureToday from "../assets/landing/mockup-feature-today.png";
import mockupFeatureCalendar from "../assets/landing/mockup-feature-calendar.png";
import mockupFeatureChat from "../assets/landing/mockup-feature-chat.png";
import mockupFeatureNotifications from "../assets/landing/mockup-feature-notifications.png";

export type Phase = "menstruation" | "follicular" | "ovulation" | "luteal";

export const PHASE_COLORS: Record<Phase, string> = {
  menstruation: "#8b3a52",
  follicular: "#b5c26a",
  ovulation: "#9b72c8",
  luteal: "#f0c4a8",
};

export const CHECK_ICON = checkIcon;

/** Single place for the sign-in/entry route every CTA points to. */
export const CTA_HREF = "/login";

/** Required by product: the app is on both stores, never iOS-only. */
export const AVAILABILITY_COPY = "Disponible para Android y iOS";

export const NAV_LINKS = [
  { label: "Cómo funciona", href: "#how-it-works" },
  { label: "Privacidad", href: "#privacy" },
  { label: "Planes", href: "#plans" },
  { label: "Redes", href: "#social" },
] as const;

export const PILLARS: { phase: Phase; title: string; text: string }[] = [
  {
    phase: "menstruation",
    title: "Registra",
    text: "Periodo, flujo, síntomas y ánimo en segundos.",
  },
  {
    phase: "follicular",
    title: "Entiende",
    text: "Qué suele pasar en cada fase de tu ciclo y por qué.",
  },
  {
    phase: "ovulation",
    title: "Pregunta",
    text: "Lila te responde con información de fuentes confiables.",
  },
];

export interface FeatureRow {
  id: string;
  phase: Phase;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  image: string;
  imageAlt: string;
}

export const FEATURES: FeatureRow[] = [
  {
    id: "today",
    phase: "menstruation",
    eyebrow: "HOY",
    title: "Tu día, en una sola pantalla",
    description:
      "Registra el inicio de tu periodo, tu flujo, tu ánimo y tus síntomas con un toque. Escribe en tu diario y mira en qué fase estás y qué suele pasar en ella.",
    points: [
      "Registro de periodo y síntomas",
      "Diario con preguntas de cada fase",
      "Lecturas cortas según tu fase",
    ],
    image: mockupFeatureToday,
    imageAlt: "Pantalla Hoy de Lila con la fase actual y el registro del día",
  },
  {
    id: "calendar",
    phase: "follicular",
    eyebrow: "CALENDARIO",
    title: "Tu mes, fase por fase",
    description:
      "Mira tus días registrados y los estimados con colores suaves para cada fase. Entre más registras, mejor se ajustan las predicciones.",
    points: [
      "Fases menstrual, folicular, ovulatoria y lútea",
      "Días registrados y estimados",
      "Vista por mes y por año",
    ],
    image: mockupFeatureCalendar,
    imageAlt: "Calendario mensual de Lila con el resumen de un día registrado",
  },
  {
    id: "chat",
    phase: "ovulation",
    eyebrow: "CHAT CON LILA",
    title: "Pregúntale a Lila lo que quieras",
    description:
      "Resuelve tus dudas a cualquier hora. Lila responde a partir de una base de conocimiento curada con fuentes científicas y tiene en cuenta en qué fase estás.",
    points: [
      "Respuestas según tu fase",
      "Historial de conversaciones",
      "No reemplaza la consulta médica",
    ],
    image: mockupFeatureChat,
    imageAlt: "Conversación con Lila en la app",
  },
  {
    id: "notifications",
    phase: "luteal",
    eyebrow: "NOTIFICACIONES",
    title: "Recordatorios a tu medida",
    description:
      "Elige qué avisos recibir y cuándo. Con el modo discreto, los mensajes en tu pantalla de bloqueo no dicen nada de tu ciclo.",
    points: [
      "Avisos de fase y de periodo",
      "Modo discreto",
      "Los activas o apagas cuando quieras",
    ],
    image: mockupFeatureNotifications,
    imageAlt: "Pantalla de bloqueo con notificaciones discretas de Lila",
  },
];

export const PRIVACY_POINTS = [
  "Lila no vende ni comparte tus datos",
  "Descarga o elimina tus datos cuando quieras",
  "Modo discreto para tus notificaciones",
  "Tratamiento de datos según la Ley 1581 de 2012",
];

export interface PlanCard {
  id: "free" | "premium" | "early-adopter";
  name: string;
  badge?: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  tinted?: boolean;
}

export const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Gratis",
    price: "$0",
    priceNote: "para siempre",
    description: "Para conocer tu ciclo desde el primer día.",
    features: [
      "Registro de periodo, flujo y síntomas",
      "Diario y registro de ánimo",
      "Calendario con fases y predicciones",
      "Chat con Lila: 3 mensajes al día",
    ],
    cta: "Empezar gratis",
  },
  {
    id: "premium",
    name: "Premium",
    badge: "Más completo",
    price: "$19.900",
    priceNote: "al mes",
    description: "Para conversar con Lila sin límite y aprender a fondo.",
    features: [
      "Todo lo del plan Gratis",
      "Chat con Lila sin límite",
      "Todo el contenido de Aprende",
      "Cancela cuando quieras desde tu perfil",
    ],
    cta: "Elegir Premium",
    featured: true,
  },
  {
    id: "early-adopter",
    name: "Early Adopter",
    badge: "Lanzamiento",
    price: "Precio especial",
    priceNote: "congelado por 5 meses",
    description: "Para quienes llegan primero y nos ayudan a construir Lila.",
    features: [
      "Todas las funciones Premium",
      "Tu precio congelado durante 5 meses",
      "Acceso prioritario a funciones nuevas",
      "Canal directo para tus comentarios",
    ],
    cta: "Quiero ser Early Adopter",
    tinted: true,
  },
];

export const SOCIAL_ACCOUNTS = [
  {
    network: "Instagram",
    handle: "@lila.careapp",
    href: "https://www.instagram.com/lila.careapp",
    phase: "ovulation" as Phase,
  },
  {
    network: "TikTok",
    handle: "@lila.care",
    href: "https://www.tiktok.com/@lila.care",
    phase: "menstruation" as Phase,
  },
];
