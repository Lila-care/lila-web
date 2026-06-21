import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { sendMessage, getConversation, getConfig, getAgentMe } from '@/api/lila'
import type { ChatMessage } from '@/api/lila'
import { getGuestId } from '@/lib/guest'

const ANON_COUNT_KEY = 'lila_anon_count'
const USER_COUNT_KEY = 'lila_user_count'

interface UseLilaChatReturn {
  messages: ChatMessage[]
  conversationId: string | null
  isLoading: boolean
  error: string | null
  freeQuestionLimit: number
  upgradePromptLimit: number
  anonCount: number
  userCount: number
  showLoginGate: boolean
  showUpgradeGate: boolean
  hasActiveTemplate: boolean
  setShowLoginGate: (v: boolean) => void
  setShowUpgradeGate: (v: boolean) => void
  sendMessage: (text: string) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  startNewConversation: () => void
}

export function useLilaChat(): UseLilaChatReturn {
  const { token } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeQuestionLimit, setFreeQuestionLimit] = useState(3)
  const [upgradePromptLimit, setUpgradePromptLimit] = useState(10)
  const [anonCount, setAnonCount] = useState(() =>
    parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? '0', 10)
  )
  const [userCount, setUserCount] = useState(() =>
    parseInt(localStorage.getItem(USER_COUNT_KEY) ?? '0', 10)
  )
  const [showLoginGate, setShowLoginGate] = useState(false)
  const [showUpgradeGate, setShowUpgradeGate] = useState(false)
  const [hasActiveTemplate, setHasActiveTemplate] = useState(true)

  // Fetch config and agent/me on mount
  useEffect(() => {
    const guestId = getGuestId()
    getConfig()
      .then((cfg) => {
        setFreeQuestionLimit(cfg.freeQuestionLimit)
        setUpgradePromptLimit(cfg.upgradePromptLimit)
      })
      .catch(() => {})

    getAgentMe(token, token ? undefined : guestId)
      .then((agent) => {
        setHasActiveTemplate(agent.hasActiveTemplate)
      })
      .catch(() => {})
  }, [token])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      // Anonymous threshold gate
      if (!token) {
        const count = parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? '0', 10)
        if (count >= freeQuestionLimit) {
          setShowLoginGate(true)
          return
        }
      }

      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      }

      // Optimistic update
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        const guestId = !token ? getGuestId() : undefined
        const response = await sendMessage(
          token,
          { message: text.trim(), conversationId: conversationId ?? undefined },
          guestId
        )

        setConversationId(response.conversationId)

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (token) {
          // Increment user count after successful response
          const newCount = parseInt(localStorage.getItem(USER_COUNT_KEY) ?? '0', 10) + 1
          localStorage.setItem(USER_COUNT_KEY, String(newCount))
          setUserCount(newCount)
          if (newCount >= upgradePromptLimit) {
            setShowUpgradeGate(true)
          }
        } else {
          // Increment anon count after successful response
          const newCount = parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? '0', 10) + 1
          localStorage.setItem(ANON_COUNT_KEY, String(newCount))
          setAnonCount(newCount)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al enviar el mensaje')
        // Remove optimistic user message on error
        setMessages((prev) => prev.filter((m) => m !== userMessage))
      } finally {
        setIsLoading(false)
      }
    },
    [token, conversationId, freeQuestionLimit, upgradePromptLimit]
  )

  const loadConversation = useCallback(
    async (id: string) => {
      if (!token) return
      setIsLoading(true)
      setError(null)
      try {
        const conv = await getConversation(token, id)
        setConversationId(conv.id)
        setMessages(conv.messages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la conversación')
      } finally {
        setIsLoading(false)
      }
    },
    [token]
  )

  const startNewConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  return {
    messages,
    conversationId,
    isLoading,
    error,
    freeQuestionLimit,
    upgradePromptLimit,
    anonCount,
    userCount,
    showLoginGate,
    showUpgradeGate,
    hasActiveTemplate,
    setShowLoginGate,
    setShowUpgradeGate,
    sendMessage: send,
    loadConversation,
    startNewConversation,
  }
}
