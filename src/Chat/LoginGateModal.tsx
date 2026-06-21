import { useLocation } from 'wouter'

interface LoginGateModalProps {
  freeQuestionLimit: number
  onClose: () => void
}

export default function LoginGateModal({ freeQuestionLimit, onClose }: LoginGateModalProps) {
  const [, navigate] = useLocation()

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2e2e2e',
          borderRadius: '24px',
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}
        className="w-full max-w-sm p-8 flex flex-col items-center text-center gap-5"
      >
        {/* Logo */}
        <img src="/sello_vinotinto.svg" alt="Lila" className="w-16 h-16" />

        {/* Title */}
        <h2
          className="text-xl font-bold leading-tight"
          style={{ color: '#F8EAFE' }}
        >
          Continúa hablando con Lila
        </h2>

        {/* Subtitle */}
        <p className="text-sm leading-relaxed" style={{ color: '#828282' }}>
          Has usado tus {freeQuestionLimit} preguntas gratuitas. Inicia sesión para seguir
          explorando sin límites.
        </p>

        {/* CTA */}
        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-[180ms]"
          style={{
            background: '#7e3565',
            color: '#F8EAFE',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#92407a'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#7e3565'
          }}
        >
          Iniciar sesión
        </button>

        {/* Secondary link */}
        <button
          onClick={onClose}
          className="text-sm underline transition-opacity hover:opacity-70"
          style={{ color: '#828282' }}
        >
          No ahora
        </button>
      </div>
    </div>
  )
}
