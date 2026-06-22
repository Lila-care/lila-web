import { useEffect, useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { getConversations } from '@/api/lila'
import type { ConversationSummary } from '@/api/lila'
import { useLilaChat } from './useLilaChat'
import ChatWindow from './ChatWindow'
import ConversationList from './ConversationList'
import LoginGateModal from './LoginGateModal'
import UpgradeGateModal from './UpgradeGateModal'

function ChatPage() {
  const { token, userId, logout } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    messages,
    conversationId,
    isLoading,
    error,
    showLoginGate,
    setShowLoginGate,
    showUpgradeGate,
    setShowUpgradeGate,
    freeQuestionLimit,
    upgradePromptLimit,
    hasActiveTemplate,
    sendMessage,
    loadConversation,
    startNewConversation,
  } = useLilaChat()

  // Load conversations list on mount (only for authenticated users)
  useEffect(() => {
    if (!token) return
    getConversations(token)
      .then((res) => setConversations(res.conversations))
      .catch(console.error)
  }, [token])

  // Refresh conversation list when a new conversationId appears
  useEffect(() => {
    if (!token || !conversationId) return
    getConversations(token)
      .then((res) => setConversations(res.conversations))
      .catch(console.error)
  }, [token, conversationId])

  const handleSelectConversation = (id: string) => {
    loadConversation(id)
    setSidebarOpen(false)
  }

  const handleNewConversation = () => {
    startNewConversation()
    setSidebarOpen(false)
  }

  const isEmptyState = hasActiveTemplate && messages.length === 0 && !isLoading

  return (
    <div className={`flex h-screen overflow-hidden ${isEmptyState ? 'bg-[#FCF9F3]' : 'bg-secondary'}`}>
      {/* Sidebar — only shown for authenticated users when not in empty state */}
      {token && !isEmptyState && (
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300
            md:relative md:translate-x-0 md:flex md:flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Sidebar header with logo */}
          <div className="flex items-center gap-2 px-4 py-4 bg-white border-b border-gray-100">
            <img src="/sello_vinotinto.svg" alt="Lila" className="w-8 h-8" />
            <span className="font-semibold text-primary text-lg">Lila</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              currentId={conversationId}
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
            />
          </div>
        </aside>
      )}

      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && !isEmptyState && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header — hidden during empty state (EmptyState has its own wordmark) */}
        {!isEmptyState && (
          <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
            {token && (
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-800 truncate">Chat con Lila</h1>
              {userId && (
                <p className="text-xs text-gray-400 truncate">{userId}</p>
              )}
            </div>

            {token && (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition px-3 py-1.5 rounded-lg hover:bg-secondary"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </header>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs text-center">
            {error}
          </div>
        )}

        {/* Chat area */}
        <div className={`flex-1 overflow-hidden ${isEmptyState ? 'bg-[#FCF9F3]' : 'bg-white'}`}>
          {!hasActiveTemplate && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm text-center px-4">
                Lila no está disponible en este momento
              </p>
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onSend={sendMessage}
            />
          )}
        </div>
      </div>

      {/* Login gate modal for anonymous users at threshold */}
      {showLoginGate && (
        <LoginGateModal
          freeQuestionLimit={freeQuestionLimit}
          onClose={() => setShowLoginGate(false)}
        />
      )}

      {/* Upgrade gate modal for authenticated users at threshold */}
      {showUpgradeGate && (
        <UpgradeGateModal
          upgradePromptLimit={upgradePromptLimit}
          onClose={() => setShowUpgradeGate(false)}
        />
      )}
    </div>
  )
}

export default ChatPage
