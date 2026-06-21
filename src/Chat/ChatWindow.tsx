import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/api/lila'
import MessageBubble from './MessageBubble'
import EmptyState from '@/components/EmptyState'

interface ChatWindowProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (text: string) => void
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-3 items-end">
      <img
        src="/lila-logo-warm.svg"
        alt="Lila"
        className="w-7 h-7 rounded-full shrink-0"
      />
      <div className="rounded-[20px] rounded-bl-[6px] px-[18px] py-[15px]" style={{ background: '#F4ECFD' }}>
        <div className="flex gap-[5px] items-center">
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#B89FE8', animation: 'lilaWDot 1.2s infinite ease-in-out' }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#B89FE8', animation: 'lilaWDot 1.2s 0.18s infinite ease-in-out' }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#B89FE8', animation: 'lilaWDot 1.2s 0.36s infinite ease-in-out' }} />
        </div>
      </div>
      <style>{`
        @keyframes lilaWDot {
          0%, 80%, 100% { transform: translateY(0); opacity: .45; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function ChatWindow({ messages, isLoading, onSend }: ChatWindowProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Show EmptyState fullscreen when there are no messages and not loading
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        <EmptyState onSend={onSend} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-[18px] py-2" style={{ background: '#FCF9F3' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3" style={{ background: '#FCF9F3', borderTop: '1px solid #EFE6DA' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex items-center gap-[10px] rounded-[24px] border bg-white px-[22px] py-2 pr-2"
          style={{ border: '1px solid #EFE6DA', boxShadow: '0 10px 30px -12px rgba(61,31,71,0.18)', fontFamily: "'Poppins', system-ui, sans-serif" }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbeme..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-[16px] text-[#3D1F47] placeholder:text-[#7c6383] outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ border: 'none', padding: '11px 0', minHeight: '44px', fontFamily: 'inherit' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Enviar"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-none transition-all duration-150 disabled:opacity-40"
            style={{ background: '#B89FE8', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed' }}
          >
            <Send size={18} color="#ffffff" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow
