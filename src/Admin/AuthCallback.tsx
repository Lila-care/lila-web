import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/auth/AuthContext";
import { migrateGuest } from "@/api/lila";
import { readExistingGuestId, clearGuestId } from "@/lib/guest";

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { login } = useAuth();
  // Cognito's authorization code is single-use: exchanging it twice makes the second
  // request fail with `invalid_grant`. This effect can otherwise run more than once per
  // code — React.StrictMode double-invokes effects in dev, and `login`/`navigate` are new
  // function references on every AuthProvider/router render, which are effect deps below.
  // Guard so the exchange (+ guest migration) fires exactly once per mount, regardless of
  // how many times the effect re-runs.
  const hasRunRef = useRef(false);
  // Set by UserLogin.tsx (/login) or Admin/Login.tsx (/admin) right before redirecting to
  // Cognito's hosted UI — this is the only handler for /auth/callback, shared by both flows,
  // so it can't otherwise tell which one the user came from. Read once per mount and cleared
  // immediately so a repeated flow never sees stale state; defaults to /login, the public
  // flow, rather than /admin.
  const loginOriginRef = useRef("/login");

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    loginOriginRef.current =
      sessionStorage.getItem("lila_login_origin") ?? "/login";
    sessionStorage.removeItem("lila_login_origin");

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No se recibió el código de autorización.");
      return;
    }

    const domain = import.meta.env.VITE_AUTH_DOMAIN;
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;

    console.group("[AuthCallback] token exchange — env vars");
    console.log("VITE_AUTH_DOMAIN :", domain);
    console.log("VITE_CLIENT_ID   :", clientId);
    console.log("VITE_REDIRECT_URI:", redirectUri);
    console.log("code             :", code);
    console.groupEnd();

    if (!domain || !clientId || !redirectUri) {
      const missing = [
        !domain && "VITE_AUTH_DOMAIN",
        !clientId && "VITE_CLIENT_ID",
        !redirectUri && "VITE_REDIRECT_URI",
      ]
        .filter(Boolean)
        .join(", ");
      console.error("[AuthCallback] Variables de entorno faltantes:", missing);
      setError(`Variables de entorno faltantes: ${missing}`);
      return;
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    });

    const tokenUrl = `${domain}/oauth2/token`;
    console.log("[AuthCallback] POST", tokenUrl, Object.fromEntries(body));

    fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Error ${res.status} al intercambiar el código`);
        return res.json();
      })
      .then(
        async (data: {
          id_token: string;
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }) => {
          login({
            idToken: data.id_token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
          });
          localStorage.removeItem("lila_anon_count");
          const existingGuestId = readExistingGuestId();
          if (existingGuestId) {
            // Awaited (not fire-and-forget) so the migration is guaranteed to finish before
            // the `/chat` mount fires its first `getAgentMe` — otherwise the reconciliation
            // payload it depends on can arrive too late for the first render.
            try {
              await migrateGuest(data.id_token, existingGuestId);
            } catch (err) {
              // A guest cookie can exist client-side (`crypto.randomUUID()`) without a
              // matching server-side guest record — that only gets created on the first
              // guest chat/agent request. Logging in without ever chatting as a guest is
              // a normal path, not an error: BE returns 404 ("Guest not found") for it.
              // Only surface unexpected failures to the console.
              const message = err instanceof Error ? err.message : "";
              if (!message.startsWith("HTTP 404")) {
                console.error("[AuthCallback] migrateGuest error:", err);
              }
            } finally {
              clearGuestId();
            }
          }
          navigate("/chat");
        },
      )
      .catch((err: Error) => {
        console.error("AuthCallback error:", err);
        setError(err.message ?? "Error desconocido al autenticar.");
      });
  }, [navigate, login]);

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
        <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center space-y-4">
          <p className="text-red-600 font-medium">Error al iniciar sesión</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <a
            href={loginOriginRef.current}
            className="text-primary underline text-sm"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text text-sm">Procesando login...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
