import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "lila_id_token";

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  userId: null,
  email: null,
  name: null,
  picture: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
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
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setIsLoading(false);
  }, []);

  // Called by the login/callback/change-password screens right after they persist a fresh
  // token — AuthProvider lives above the router and never remounts on SPA navigation, so
  // without this the context would keep showing the pre-login (Guest) state until a full reload.
  const login = (stored: string) => {
    localStorage.setItem(TOKEN_KEY, stored);
    applyToken(stored);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
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

export { TOKEN_KEY };
