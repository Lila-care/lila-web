import { Plus, MessageCircle } from 'lucide-react'
import type { ConversationSummary } from '@/api/lila'

interface ConversationListProps {
  conversations: ConversationSummary[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function ConversationList({ conversations, currentId, onSelect, onNew }: ConversationListProps) {
  return (
    <div className="flex flex-col h-full bg-secondary border-r border-gray-100">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus size={16} />
          Nueva conversación
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <p className="text-gray-400 text-xs text-center mt-8 px-4">
            Aún no tienes conversaciones
          </p>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/60 transition rounded-xl mx-1 ${
              currentId === conv.id ? 'bg-white shadow-sm' : ''
            }`}
          >
            <MessageCircle
              size={16}
              className={`mt-0.5 shrink-0 ${currentId === conv.id ? 'text-primary' : 'text-gray-400'}`}
            />
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${currentId === conv.id ? 'text-primary' : 'text-gray-700'}`}>
                {formatDate(conv.createdAt)}
              </p>
              <p className="text-xs text-gray-400">
                {conv.messageCount} {conv.messageCount === 1 ? 'mensaje' : 'mensajes'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ConversationList
