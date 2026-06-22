import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLocation } from 'wouter'

const TOKEN_KEY = 'lila_id_token'

interface AuthContextValue {
  token: string | null
  userId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
})

function decodeToken(token: string): { sub: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload) return false
  return payload.exp * 1000 > Date.now()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, navigate] = useLocation()

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored && isTokenValid(stored)) {
      const payload = decodeToken(stored)
      setToken(stored)
      setUserId(payload?.sub ?? null)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    setIsLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUserId(null)
    navigate('/admin')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        isAuthenticated: !!token,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export { TOKEN_KEY }
