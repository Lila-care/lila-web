import selloLila from "/sello_vinotinto.svg";

const handleGoogleLogin = () => {
  const domain = import.meta.env.VITE_AUTH_DOMAIN;
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;

  const params = new URLSearchParams({
    identity_provider: "Google",
    redirect_uri: redirectUri,
    response_type: "code",
    client_id: clientId,
    scope: "openid email profile",
  });

  sessionStorage.setItem("lila_login_origin", "/login");
  window.location.assign(`${domain}/oauth2/authorize?${params.toString()}`);
};

export default function UserLogin() {
  return (
    <div
      className="w-full min-h-screen flex items-center justify-center"
      style={{
        background: "#0f0f0f",
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}
    >
      <div
        className="w-full max-w-sm p-10 flex flex-col items-center text-center gap-6 rounded-3xl"
        style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}
      >
        <img src={selloLila} alt="Lila" className="w-20 h-20" />

        <h1 className="text-2xl font-bold" style={{ color: "#F8EAFE" }}>
          Bienvenida a Lila
        </h1>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: "#7e3565", color: "#F8EAFE" }}
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="h-5 w-5"
          />
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
