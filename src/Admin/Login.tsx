import { useState } from 'react'
import { useLocation } from 'wouter'
import selloLila from '/sello_vinotinto.svg'
import { loginWithPassword, LoginDto, AuthTokens } from '@/api/lila'
import { TOKEN_KEY } from '@/auth/AuthContext'

const handleGoogleLogin = () => {
  const domain = import.meta.env.VITE_AUTH_DOMAIN
  const clientId = import.meta.env.VITE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_REDIRECT_URI

  console.group('[Login] handleGoogleLogin — env vars')
  console.log('VITE_AUTH_DOMAIN :', domain)
  console.log('VITE_CLIENT_ID   :', clientId)
  console.log('VITE_REDIRECT_URI:', redirectUri)
  console.groupEnd()

  if (!domain || !clientId || !redirectUri) {
    console.error('[Login] Una o más variables de entorno requeridas están undefined. Abortando redirect.')
    return
  }

  const params = new URLSearchParams({
    identity_provider: 'Google',
    redirect_uri: redirectUri,
    response_type: 'code',
    client_id: clientId,
    scope: 'openid',
  })

  const url = `${domain}/oauth2/authorize?${params.toString()}`
  console.log('[Login] URL construida:', url)
  window.location.assign(url)
}

function Login() {
  const [, navigate] = useLocation()
  const [form, setForm] = useState<LoginDto>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginWithPassword(form)
      if ('challenge' in result && result.challenge === 'NEW_PASSWORD_REQUIRED') {
        navigate('/admin/change-password', {
          state: { email: form.email, session: result.session },
        })
        return
      }
      localStorage.setItem(TOKEN_KEY, (result as AuthTokens).idToken)
      navigate('/admin/dashboard')
    } catch {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center space-y-6">

        {/* Logo */}
        <img
          src={selloLila}
          alt="Lila Logo"
          className="mx-auto h-20 object-contain"
        />

        <h1 className="text-2xl font-bold text-gray-800">
          Bienvenida al Panel Administrativo
        </h1>
        <p className="text-gray-500">
          Accede con tu correo corporativo para continuar
        </p>

        <button
          onClick={handleGoogleLogin}
          className="flex bg-primary items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="h-5 w-5"
          />
          <span className="text-white font-medium">Continuar con Google</span>
        </button>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-gray-400 text-sm">o</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left" data-testid="login-form">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@lila.com"
              data-testid="login-email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              data-testid="login-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm" data-testid="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
            data-testid="login-submit"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  )
}

export default Login
