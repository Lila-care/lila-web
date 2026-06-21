import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { TOKEN_KEY } from '@/auth/AuthContext'
import { migrateGuest } from '@/api/lila'
import { readExistingGuestId, clearGuestId } from '@/lib/guest'

function AuthCallback() {
  const [error, setError] = useState<string | null>(null)
  const [, navigate] = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      setError('No se recibió el código de autorización.')
      return
    }

    const domain = import.meta.env.VITE_AUTH_DOMAIN
    const clientId = import.meta.env.VITE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_REDIRECT_URI

    console.group('[AuthCallback] token exchange — env vars')
    console.log('VITE_AUTH_DOMAIN :', domain)
    console.log('VITE_CLIENT_ID   :', clientId)
    console.log('VITE_REDIRECT_URI:', redirectUri)
    console.log('code             :', code)
    console.groupEnd()

    if (!domain || !clientId || !redirectUri) {
      const missing = [
        !domain && 'VITE_AUTH_DOMAIN',
        !clientId && 'VITE_CLIENT_ID',
        !redirectUri && 'VITE_REDIRECT_URI',
      ].filter(Boolean).join(', ')
      console.error('[AuthCallback] Variables de entorno faltantes:', missing)
      setError(`Variables de entorno faltantes: ${missing}`)
      return
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    })

    const tokenUrl = `${domain}/oauth2/token`
    console.log('[AuthCallback] POST', tokenUrl, Object.fromEntries(body))

    fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status} al intercambiar el código`)
        return res.json()
      })
      .then((data: { id_token: string; access_token: string; refresh_token: string }) => {
        localStorage.setItem(TOKEN_KEY, data.id_token)
        localStorage.removeItem('lila_anon_count')
        const existingGuestId = readExistingGuestId()
        if (existingGuestId) {
          migrateGuest(data.id_token, existingGuestId)
            .catch(console.error)
            .finally(() => clearGuestId())
        }
        navigate('/chat')
      })
      .catch((err: Error) => {
        console.error('AuthCallback error:', err)
        setError(err.message ?? 'Error desconocido al autenticar.')
      })
  }, [navigate])

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
        <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center space-y-4">
          <p className="text-red-600 font-medium">Error al iniciar sesión</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <a href="/admin" className="text-primary underline text-sm">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text text-sm">Procesando login...</p>
      </div>
    </div>
  )
}

export default AuthCallback
