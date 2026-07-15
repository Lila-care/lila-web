import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, Download } from "lucide-react";
import AppShell from "@/components/AppShell/AppShell";

const WHAT_WE_KEEP = [
  "Las fechas de tu ciclo, para calcular tus fases",
  "Tus síntomas y estado de ánimo, si eliges registrarlos",
  "Tus entradas de diario, cifradas",
  "Tus conversaciones con Lila, para dar continuidad",
];

const WHAT_WE_NEVER_DO = [
  "Vender tus datos a terceros, nunca",
  "Compartir con anunciantes o aseguradoras",
  "Rastrearte fuera de la app",
  "Pedirte que cambies privacidad por funciones",
];

// Contenido 100% estático — mismos botones "Próximamente" del Perfil (sin endpoint en ms-lila).
function PrivacidadPage() {
  return (
    <AppShell>
      <main className="px-6 md:px-16 pt-14 pb-16 max-w-[920px]">
        <Link
          href="/perfil"
          data-testid="privacidad-back-link"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold mb-6"
          style={{ color: "rgba(61,43,80,0.5)" }}
        >
          <ArrowLeft size={14} />
          Perfil
        </Link>

        <h1
          className="font-bold text-3xl md:text-5xl mb-4 -tracking-[0.5px] max-w-[640px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Tus datos son tuyos. Punto.
        </h1>
        <p
          className="text-base md:text-[16.5px] leading-relaxed max-w-[600px] mb-11"
          style={{ color: "rgba(61,43,80,0.7)" }}
        >
          Lila existe porque otra app vendió los datos de sus usuarias. No repetimos ese
          error — nunca lo haremos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-9">
          <div
            className="bg-white rounded-3xl p-7"
            style={{
              border: "1px solid rgba(61,43,80,0.07)",
              boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center"
                style={{ background: "#EEF2E1" }}
              >
                <CheckCircle2 size={19} color="#7A9142" />
              </div>
              <div
                className="font-semibold text-[19px]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Qué guardamos
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              {WHAT_WE_KEEP.map((item) => (
                <div
                  key={item}
                  className="text-[14.5px] leading-relaxed"
                  style={{ color: "rgba(61,43,80,0.75)" }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            className="bg-white rounded-3xl p-7"
            style={{
              border: "1px solid rgba(61,43,80,0.07)",
              boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center"
                style={{ background: "#F8E3E9" }}
              >
                <XCircle size={19} color="#8B3A52" />
              </div>
              <div
                className="font-semibold text-[19px]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Qué nunca haremos
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              {WHAT_WE_NEVER_DO.map((item) => (
                <div
                  key={item}
                  className="text-[14.5px] leading-relaxed"
                  style={{ color: "rgba(61,43,80,0.75)" }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl p-7 md:p-9 flex items-center justify-between gap-6 flex-wrap"
          style={{ background: "linear-gradient(120deg, #9B72C8, #ab86d1)" }}
        >
          <div>
            <div className="font-semibold text-xl text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tú decides qué pasa con tus datos
            </div>
            <div className="text-[14.5px] text-white/85 max-w-[400px] leading-relaxed">
              Descárgalos cuando quieras o bórralos por completo, sin preguntas.
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              type="button"
              disabled
              title="Próximamente"
              data-testid="privacidad-download-button"
              className="flex items-center justify-center gap-2 bg-white text-[#9B72C8] px-5 py-3 rounded-2xl text-sm font-semibold cursor-not-allowed opacity-70 whitespace-nowrap"
            >
              <Download size={16} />
              Descargar mis datos
            </button>
            <button
              type="button"
              disabled
              title="Próximamente"
              data-testid="privacidad-delete-button"
              className="bg-white/15 text-white px-5 py-3 rounded-2xl text-sm font-semibold cursor-not-allowed opacity-70 whitespace-nowrap"
              style={{ border: "1.5px solid rgba(255,255,255,0.4)" }}
            >
              Borrar todo
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export default PrivacidadPage;
