import { useLocation } from "wouter";

// Solo se muestra cuando !token (usuario guest) — mismo patrón de navegación que
// AccountBanner.tsx usa para su CTA de "Guest" (useLocation + navigate("/login")).
function CreateAccountBanner() {
  const [, navigate] = useLocation();

  return (
    <div
      data-testid="create-account-banner"
      className="rounded-3xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-7"
      style={{ background: "linear-gradient(120deg, #F0C4A8, #F6DCC7)" }}
    >
      <div>
        <div
          className="font-semibold text-xl mb-1.5"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sincroniza tus ritmos
        </div>
        <div
          className="text-[14.5px] leading-relaxed max-w-[420px]"
          style={{ color: "rgba(61,43,80,0.75)" }}
        >
          Crea una cuenta para no perder tus datos y acceder desde cualquier lugar.
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate("/login")}
        data-testid="create-account-button"
        className="shrink-0 text-white px-6.5 py-3.5 rounded-2xl text-[14.5px] font-semibold"
        style={{ background: "#3D2B50" }}
      >
        Crear cuenta
      </button>
    </div>
  );
}

export default CreateAccountBanner;
