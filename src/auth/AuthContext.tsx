import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "lila_id_token";
const ACCESS_TOKEN_KEY = "lila_access_token";
const REFRESH_TOKEN_KEY = "lila_refresh_token";
const EXPIRES_AT_KEY = "lila_expires_at";

const BASE_URL = import.meta.env.VITE_API_URL;

export interface LoginTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextValue {
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: LoginTokens) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  accessToken: null,
  refreshToken: null,
  userId: null,
  email: null,
  name: null,
  picture: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: async () => {},
});

interface TokenPayload {
  sub: string;
  exp: number;
  email?: string;
  name?: string;
  given_name?: string;
  picture?: string;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [picture, setPicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  const applyToken = (stored: string) => {
    const payload = decodeToken(stored);
    setToken(stored);
    setUserId(payload?.sub ?? null);
    setEmail(payload?.email ?? null);
    // Cognito's `name` claim is not always populated (depends on IdP scopes granted at
    // login) — fall back to `given_name` so we still show something other than the email.
    setName(payload?.name ?? payload?.given_name ?? null);
    setPicture(payload?.picture ?? null);
  };

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && isTokenValid(stored)) {
      applyToken(stored);
      setAccessToken(localStorage.getItem(ACCESS_TOKEN_KEY));
      setRefreshToken(localStorage.getItem(REFRESH_TOKEN_KEY));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(EXPIRES_AT_KEY);
    }
    setIsLoading(false);
  }, []);

  // Called by the login/callback/change-password screens right after they persist a fresh
  // token — AuthProvider lives above the router and never remounts on SPA navigation, so
  // without this the context would keep showing the pre-login (Guest) state until a full reload.
  const login = (tokens: LoginTokens) => {
    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem(TOKEN_KEY, tokens.idToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    applyToken(tokens.idToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
  };

  const clearAuthStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  };

  const logout = async () => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedAccessToken) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${storedAccessToken}` },
        });
      } catch {
        // Best-effort — even if the network call fails or Cognito can't revoke the
        // token server-side, we still want to clear local state and log the user out
        // of this device.
      }
    }
    clearAuthStorage();
    setToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    setEmail(null);
    setName(null);
    setPicture(null);
    navigate("/chat");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        accessToken,
        refreshToken,
        userId,
        email,
        name,
        picture,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { TOKEN_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY };
