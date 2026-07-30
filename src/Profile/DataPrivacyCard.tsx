import { Link } from "wouter";
import { Download, Shield } from "lucide-react";

// "Descargar mis datos" y "Borrar todo" no tienen endpoint en ms-lila — visibles pero
// disabled + title, nunca disparan requests (gap documentado en el contrato técnico).
function DataPrivacyCard() {
  return (
    <div
      data-testid="data-privacy-card"
      className="bg-white rounded-3xl p-6 md:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-9"
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div className="flex gap-4 items-start min-w-0 flex-1">
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#F3EDF7" }}
        >
          <Shield size={19} color="#9B72C8" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href="/profile/privacy"
            data-testid="privacy-link"
            className="inline-block font-semibold text-[19px] mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: "#3D2B50" }}
          >
            Datos y privacidad →
          </Link>
          <div
            data-testid="data-privacy-description"
            className="text-[14.5px] leading-relaxed max-w-[460px]"
            style={{ color: "rgba(61,43,80,0.7)" }}
          >
            Tus datos están cifrados. Puedes exportarlos o borrarlos cuando quieras.
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2.5 shrink-0 w-full lg:w-auto">
        <button
          type="button"
          disabled
          title="Próximamente"
          data-testid="download-data-button"
          className="flex items-center gap-2 bg-white px-4.5 py-2.5 rounded-xl text-[13.5px] font-semibold whitespace-nowrap cursor-not-allowed opacity-60"
          style={{ border: "1.5px solid #9B72C8", color: "#9B72C8" }}
        >
          <Download size={15} />
          Descargar mis datos
        </button>
        <button
          type="button"
          disabled
          title="Próximamente"
          data-testid="delete-all-button"
          className="flex items-center gap-1.5 bg-transparent text-[13px] font-semibold cursor-not-allowed opacity-60"
          style={{ color: "#8B3A52" }}
        >
          Borrar todo
        </button>
      </div>
    </div>
  );
}

export default DataPrivacyCard;
