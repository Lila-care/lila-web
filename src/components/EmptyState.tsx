import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

const CHIPS = [
  '¿Por qué me siento así hoy?',
  'Explícame mi ciclo',
  '¿Es normal este síntoma?',
  'Quiero escribir en mi diario',
]

interface Props {
  onSend: (message: string) => void
}

export default function EmptyState({ onSend }: Props) {
  const [draft, setDraft] = useState('')

  const handleSend = (text: string) => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setDraft('')
  }

  return (
    <div
      style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
      className="relative flex h-full min-h-screen w-full flex-col overflow-hidden text-[#3D1F47]"
      // Background: warm cream #FCF9F3
      // Background is set via CSS to avoid Tailwind purge issues with this specific color
    >
      {/* Actual bg via style since it's a non-standard color */}
      <div className="absolute inset-0 -z-10" style={{ background: '#FCF9F3' }} />

      {/* Decorative corner blobs */}
      <div
        className="pointer-events-none absolute -top-[90px] -right-[70px] h-[300px] w-[300px]"
        style={{
          borderRadius: '46% 54% 60% 40% / 52% 44% 56% 48%',
          background: '#B89FE8',
          opacity: 0.07,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[110px] -left-[80px] h-[280px] w-[280px]"
        style={{
          borderRadius: '58% 42% 45% 55% / 48% 56% 44% 52%',
          background: '#C4C97A',
          opacity: 0.08,
        }}
        aria-hidden
      />

      {/* Header with logo + wordmark */}
      <header className="relative z-10 flex items-center gap-[9px] px-[22px] py-5">
        <img src="/lila-logo-warm.svg" alt="" className="h-[30px] w-[30px] object-contain" />
        <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#3D1F47]">lila</span>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 pb-0 pt-2 text-center">
        {/* Logo with lavender glow */}
        <div
          className="relative mb-[26px] flex items-center justify-center"
          style={{ width: 'clamp(150px,40vw,210px)', height: 'clamp(150px,40vw,210px)' }}
        >
          <div
            className="absolute"
            style={{
              width: '118%',
              height: '118%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #B89FE8 0%, rgba(184,159,232,0) 68%)',
              filter: 'blur(8px)',
              animation: 'lilaWGlow 6s ease-in-out infinite',
            }}
            aria-hidden
          />
          <img
            src="/lila-logo-warm.svg"
            alt="Lila"
            className="relative object-contain"
            style={{ width: '78%', height: '78%', animation: 'lilaWFloat 6s ease-in-out infinite' }}
          />
        </div>

        <h1
          className="m-0 mb-3.5 font-bold text-[#3D1F47]"
          style={{
            fontSize: 'clamp(26px,5vw,40px)',
            lineHeight: 1.16,
            letterSpacing: '-0.02em',
            maxWidth: '14ch',
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}
        >
          Tu espacio para entender tu cuerpo
        </h1>
        <p
          className="m-0 text-[#7c6383]"
          style={{ fontSize: 'clamp(14px,2vw,18px)', lineHeight: 1.5, maxWidth: '34ch' }}
        >
          Pregúntame lo que necesitas saber
        </p>
      </main>

      {/* Bottom section: chips + composer */}
      <div className="relative z-10 mx-auto w-full max-w-[640px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-0 flex flex-col gap-4">
        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-[10px]">
          {CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSend(label)}
              className="cursor-pointer whitespace-nowrap rounded-full border font-medium text-[#3D1F47] transition-all duration-[180ms] ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89FE8]"
              style={{
                fontFamily: 'inherit',
                fontSize: 14,
                background: '#F4ECFD',
                border: '1px solid #E3D3F7',
                borderRadius: 999,
                minHeight: 44,
                padding: '0 18px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.background = '#EBDDFA'
                el.style.borderColor = '#B89FE8'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.background = '#F4ECFD'
                el.style.borderColor = '#E3D3F7'
                el.style.transform = ''
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(draft)
          }}
          className="flex items-center gap-[10px] rounded-[24px] border bg-white px-[22px] py-2 pr-2 transition-all duration-[180ms] ease-out focus-within:shadow-[0_14px_36px_-12px_rgba(184,159,232,0.4)]"
          style={{
            border: '1px solid #EFE6DA',
            boxShadow: '0 10px 30px -12px rgba(61,31,71,0.18)',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLFormElement).style.borderColor = '#B89FE8' }}
          onBlur={(e) => { (e.currentTarget as HTMLFormElement).style.borderColor = '#EFE6DA' }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escríbeme..."
            className="flex-1 bg-transparent text-[16px] text-[#3D1F47] outline-none"
            style={{ fontFamily: 'inherit', padding: '11px 0', border: 'none' }}
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-[16px] border-none transition-all duration-[180ms] ease-out active:scale-[0.94]"
            style={{ background: '#B89FE8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#a88ee0' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#B89FE8' }}
          >
            <ArrowRight size={20} strokeWidth={2.2} color="#ffffff" />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes lilaWFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes lilaWGlow {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: .8; transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}
