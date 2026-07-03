import { useState } from "react";
import { useLocation } from "wouter";
import selloLila from "/sello_vinotinto.svg";
import { confirmNewPassword } from "@/api/lila";
import { useAuth } from "@/auth/AuthContext";

interface LocationState {
  email: string;
  session: string;
}

function ChangePassword() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const state = (window.history.state as LocationState | null) ?? null;
  const email = state?.email ?? "";
  const session = state?.session ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!email || !session) {
      setError(
        "Sesión inválida. Regresa al inicio de sesión e intenta de nuevo.",
      );
      return;
    }

    setLoading(true);
    try {
      const tokens = await confirmNewPassword({ email, newPassword, session });
      login(tokens.idToken);
      navigate("/admin/dashboard");
    } catch {
      setError("No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center space-y-6">
        <img
          src={selloLila}
          alt="Lila Logo"
          className="mx-auto h-20 object-contain"
        />

        <h1 className="text-2xl font-bold text-gray-800">
          Crea tu nueva contraseña
        </h1>
        <p className="text-gray-500 text-sm">
          Esta es la primera vez que accedes. Debes establecer una contraseña
          nueva.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-left"
          data-testid="change-password-form"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              data-testid="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              data-testid="confirm-password"
            />
          </div>

          {error && (
            <p
              className="text-red-600 text-sm"
              data-testid="change-password-error"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
            data-testid="change-password-submit"
          >
            {loading ? "Guardando..." : "Establecer contraseña"}
          </button>
        </form>

        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;
