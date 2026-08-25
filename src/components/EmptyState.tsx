import { useState, KeyboardEvent } from "react";
import {
  ArrowUp,
  Mic,
  Sparkles,
  PlusCircle,
  Smile,
  BookOpen,
} from "lucide-react";

const GUEST_SUGGESTIONS = [
  "Prueba preguntarme sobre tu ciclo",
  "Tips de bienestar",
  "¿Qué puedo hacer por ti?",
];

const REGISTERED_SUGGESTIONS = [
  {
    icon: PlusCircle,
    title: "Registrar mi día",
    description: "Anota tus síntomas y emociones actuales",
    prompt: "Quiero registrar mi día",
  },
  {
    icon: Sparkles,
    title: "Consultar mi ciclo",
    description: "Predicciones y fase hormonal de hoy",
    prompt: "¿En qué fase de mi ciclo estoy hoy?",
  },
  {
    icon: Smile,
    title: "¿Cómo me siento hoy?",
    description: "Recibe consejos para mejorar tu humor",
    prompt: "¿Cómo me siento hoy?",
  },
  {
    icon: BookOpen,
    title: "Aprender algo nuevo",
    description: "Explora artículos sobre salud femenina",
    prompt: "Enséñame algo nuevo sobre salud femenina",
  },
];

interface Props {
  onSend: (message: string) => void;
  isAuthenticated: boolean;
  userName?: string | null;
  onCreateAccount?: () => void;
}

export default function EmptyState({
  onSend,
  isAuthenticated,
  userName,
  onCreateAccount,
}: Props) {
  const [draft, setDraft] = useState("");

  const handleSend = (text: string) => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(draft);
    }
  };

  const firstName = userName?.split(" ")[0];

  return (
    <div
      data-testid="empty-state"
      style={{
        fontFamily: "'Poppins', system-ui, sans-serif",
        background: "var(--surface-brand-light)",
      }}
      className="relative flex h-full w-full flex-col overflow-hidden"
    >
      {/* Header with logo + wordmark — solo visible en mobile, donde el rail de nav (con su
          propio logo) está oculto */}
      <header className="relative z-10 flex items-center gap-[9px] px-[22px] py-5 md:hidden">
        <img
          src="/lila-logo-warm.svg"
          alt=""
          className="h-[30px] w-[30px] object-contain"
        />
        <span
          className="text-[18px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--brand-primary-dark)" }}
        >
          lila
        </span>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 pb-0 pt-2 text-center">
        <div
          className="relative mb-[26px] flex items-center justify-center rounded-[40px]"
          style={{
            width: "80px",
            height: "80px",
            background: "var(--surface-muted)",
            boxShadow: "0px 8px 12px rgba(124,58,237,0.06)",
          }}
        >
          <img
            src="/sello_vinotinto.svg"
            alt="Lila"
            className="object-contain"
            style={{ width: isAuthenticated ? "56%" : "45%" }}
          />
        </div>

        <h1
          className="m-0 mb-2 font-semibold"
          style={{
            fontSize: "28px",
            lineHeight: 1.16,
            letterSpacing: "-0.02em",
            maxWidth: "14ch",
            color: "var(--text-primary)",
          }}
        >
          {isAuthenticated
            ? `¡Hola${firstName ? `, ${firstName}` : ""}! ¿En qué puedo ayudarte hoy?`
            : "¡Hola! Soy Lila, tu asistente de bienestar"}
        </h1>
        <p
          className="m-0"
          style={{
            fontSize: "14px",
            lineHeight: 1.5,
            maxWidth: isAuthenticated ? "40ch" : "34ch",
            color: "var(--text-secondary)",
          }}
        >
          {isAuthenticated
            ? "Estoy aquí para acompañarte en tu bienestar físico y emocional."
            : "Pregúntame lo que necesitas saber"}
        </p>
      </main>

      {/* Bottom section: suggestions + composer */}
      <div className="relative z-10 mx-auto w-full max-w-[640px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-6 flex flex-col gap-4">
        {isAuthenticated ? (
          <div className="mx-auto grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
            {REGISTERED_SUGGESTIONS.map(
              ({ icon: Icon, title, description, prompt }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="flex items-center gap-3 rounded-2xl p-4 text-left border border-solid transition-shadow"
                  style={{
                    background: "var(--surface-default)",
                    borderColor: "var(--border-default)",
                    boxShadow: "0px 8px 12px rgba(124,58,237,0.06)",
                  }}
                >
                  <span
                    className="flex shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      width: 32,
                      height: 32,
                      background: "var(--surface-muted)",
                    }}
                  >
                    <Icon size={16} color="var(--brand-primary)" />
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {title}
                    </span>
                    <span
                      className="text-[11px] truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {description}
                    </span>
                  </span>
                </button>
              ),
            )}
          </div>
        ) : (
          <>
            <div className="mx-auto flex w-full max-w-[520px] flex-wrap justify-center gap-2">
              {GUEST_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="max-w-full min-w-0 rounded-[99px] border border-solid px-4 py-2 text-[13px] font-medium"
                  style={{
                    background: "var(--surface-brand-light)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-4 rounded-2xl p-4"
              style={{
                background: "var(--surface-brand-light)",
                border: "1px solid var(--border-default)",
              }}
            >
              <Sparkles size={20} color="var(--brand-primary)" />
              <p
                className="flex-1 text-[13px] font-medium"
                style={{ color: "var(--brand-primary)" }}
              >
                Crea una cuenta para guardar tu historial y personalizar tu
                experiencia
              </p>
              <button
                type="button"
                onClick={onCreateAccount}
                className="rounded-[10px] px-3.5 py-2 text-xs font-bold whitespace-nowrap"
                style={{
                  background: "var(--brand-primary)",
                  color: "var(--text-on-brand)",
                }}
              >
                Crear cuenta
              </button>
            </div>
          </>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(draft);
          }}
          className="flex items-center gap-4 rounded-[20px] px-5 transition-[border-color] duration-150"
          style={{
            height: 64,
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            boxShadow: "0px 8px 12px rgba(124,58,237,0.06)",
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbeme..."
            className="flex-1 bg-transparent outline-none border-none"
            style={{
              fontFamily: "inherit",
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          />
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-[18px]"
              style={{
                width: 36,
                height: 36,
                background: isAuthenticated
                  ? "var(--surface-warm)"
                  : "var(--surface-subtle)",
              }}
            >
              <Mic size={16} color="var(--brand-primary)" />
            </span>
            <button
              type="submit"
              aria-label="Enviar"
              className="flex items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                background: "var(--brand-primary)",
              }}
            >
              <ArrowUp size={16} color="var(--text-on-brand)" />
            </button>
          </div>
        </form>
        {!isAuthenticated && (
          <p
            className="text-center"
            style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}
          >
            Lila puede equivocarse. Verifica la información importante de salud
            con tu médica.
          </p>
        )}
      </div>
    </div>
  );
}
