import { useState } from "react";
import { ArrowUp } from "lucide-react";

const SUGGESTIONS = [
  { cat: "Bienestar", q: "¿Por qué me siento así hoy?" },
  { cat: "Conocimiento", q: "Explícame mi ciclo" },
  { cat: "Salud", q: "¿Es normal este síntoma?" },
  { cat: "Diario", q: "Quiero escribir en mi diario" },
];

interface Props {
  onSend: (message: string) => void;
}

export default function EmptyState({ onSend }: Props) {
  const [draft, setDraft] = useState("");

  const handleSend = (text: string) => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setDraft("");
  };

  return (
    <div
      data-testid="empty-state"
      style={{
        fontFamily: "'Poppins', system-ui, sans-serif",
        background: "#FAF8FC",
      }}
      className="relative flex h-full w-full flex-col overflow-hidden text-[#2A2530]"
    >
      {/* Header with logo + wordmark */}
      <header className="relative z-10 flex items-center gap-[9px] px-[22px] py-5">
        <img
          src="/lila-logo-warm.svg"
          alt=""
          className="h-[30px] w-[30px] object-contain"
        />
        <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#4A2D6E]">
          lila
        </span>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 pb-0 pt-2 text-center">
        {/* Logo with lavender glow */}
        <div
          className="relative mb-[26px] flex items-center justify-center"
          style={{
            width: "clamp(150px,40vw,210px)",
            height: "clamp(150px,40vw,210px)",
          }}
        >
          <div
            className="absolute"
            style={{
              width: "118%",
              height: "118%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #B9A3E3 0%, rgba(185,163,227,0) 68%)",
              filter: "blur(8px)",
              animation: "lilaWGlow 6s ease-in-out infinite",
            }}
            aria-hidden
          />
          <img
            src="/lila-logo-warm.svg"
            alt="Lila"
            className="relative object-contain"
            style={{
              width: "78%",
              height: "78%",
              animation: "lilaWFloat 6s ease-in-out infinite",
            }}
          />
        </div>

        <h1
          className="m-0 mb-3.5 font-semibold text-[#4A2D6E]"
          style={{
            fontSize: "clamp(26px,5vw,40px)",
            lineHeight: 1.16,
            letterSpacing: "-0.02em",
            maxWidth: "14ch",
            textWrap: "balance" as React.CSSProperties["textWrap"],
          }}
        >
          Tu espacio para entender tu cuerpo
        </h1>
        <p
          className="m-0 text-[#8A8194]"
          style={{
            fontSize: "clamp(14px,2vw,18px)",
            lineHeight: 1.5,
            maxWidth: "34ch",
          }}
        >
          Pregúntame lo que necesitas saber
        </p>
      </main>

      {/* Bottom section: suggestion cards + composer */}
      <div className="relative z-10 mx-auto w-full max-w-[640px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-0 flex flex-col gap-4">
        {/* Suggestion cards */}
        <div
          className="mx-auto w-full"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 12,
            maxWidth: 520,
          }}
        >
          {SUGGESTIONS.map(({ cat, q }) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="cursor-pointer flex flex-col gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B9A3E3]"
              style={{
                fontFamily: "inherit",
                background: "#fff",
                border: "1px solid rgba(74,45,110,.09)",
                borderRadius: 14,
                padding: 16,
                transition:
                  "border-color .14s ease, box-shadow .14s ease, transform .14s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "#B9A3E3";
                el.style.boxShadow = "0 4px 14px rgba(185,163,227,.22)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(74,45,110,.09)";
                el.style.boxShadow = "none";
                el.style.transform = "";
              }}
            >
              <span
                className="uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: "#B9A3E3",
                }}
              >
                {cat}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#2A2530" }}>
                {q}
              </span>
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(draft);
          }}
          className="flex items-center gap-2 rounded-[26px] bg-white px-2 py-2 pl-[22px] transition-[border-color] duration-150"
          style={{
            border: "1.5px solid transparent",
            boxShadow: "0 2px 16px rgba(74,45,110,.08)",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLFormElement).style.borderColor = "#B9A3E3";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLFormElement).style.borderColor =
              "transparent";
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escríbeme..."
            className="flex-1 bg-transparent text-[15px] text-[#2A2530] outline-none placeholder:text-[#9B93A6]"
            style={{ fontFamily: "inherit", padding: "11px 0", border: "none" }}
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="flex h-[42px] w-[42px] flex-none cursor-pointer items-center justify-center rounded-full transition-transform duration-150"
            style={{
              background: "#4A2D6E",
              border: "none",
              boxShadow: "0 3px 10px rgba(74,45,110,.28)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "";
            }}
          >
            <ArrowUp size={19} strokeWidth={2.1} color="#ffffff" />
          </button>
        </form>
        <p
          className="text-center"
          style={{ fontSize: 11, color: "#A79FB2", margin: 0 }}
        >
          Lila puede equivocarse. Verifica la información importante de salud
          con tu médica.
        </p>
      </div>

      <style>{`
        @keyframes lilaWFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes lilaWGlow {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: .8; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
