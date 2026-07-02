import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  sendMessage,
  getConversation,
  getConfig,
  getAgentMe,
} from "@/api/lila";
import type { ChatMessage } from "@/api/lila";
import { getGuestId } from "@/lib/guest";

const ANON_COUNT_KEY = "lila_anon_count";
const USER_COUNT_KEY = "lila_user_count";

interface UseLilaChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  freeQuestionLimit: number;
  upgradePromptLimit: number;
  anonCount: number;
  userCount: number;
  showLoginGate: boolean;
  showUpgradeGate: boolean;
  hasActiveTemplate: boolean;
  onboardingPending: boolean;
  setShowLoginGate: (v: boolean) => void;
  setShowUpgradeGate: (v: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
}

export function useLilaChat(): UseLilaChatReturn {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeQuestionLimit, setFreeQuestionLimit] = useState(3);
  const [upgradePromptLimit, setUpgradePromptLimit] = useState(10);
  const [anonCount, setAnonCount] = useState(() =>
    parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? "0", 10),
  );
  const [userCount, setUserCount] = useState(() =>
    parseInt(localStorage.getItem(USER_COUNT_KEY) ?? "0", 10),
  );
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [hasActiveTemplate, setHasActiveTemplate] = useState(true);
  const [onboardingPending, setOnboardingPending] = useState(false);

  // Re-fetches agent/me and syncs the local onboarding flag — reused both on mount and after
  // every turn during onboarding, since the backend has no dedicated "onboarding complete" event.
  const refreshAgentMe = useCallback(async () => {
    const guestId = getGuestId();
    const agent = await getAgentMe(token, token ? undefined : guestId);
    setHasActiveTemplate(agent.hasActiveTemplate);
    setOnboardingPending(agent.onboarding.pending);
    return agent;
  }, [token]);

  // Fetch config and agent/me on mount
  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setFreeQuestionLimit(cfg.freeQuestionLimit);
        setUpgradePromptLimit(cfg.upgradePromptLimit);
      })
      .catch(() => {});

    refreshAgentMe()
      .then((agent) => {
        // Seed the greeting as the first assistant message only when the conversation is
        // still empty — avoids re-injecting it after the user has already started typing or
        // after loading an existing conversation.
        if (agent.onboarding.pending && agent.onboarding.greetingMessage) {
          const greeting = agent.onboarding.greetingMessage;
          setMessages((prev) =>
            prev.length === 0
              ? [
                  {
                    role: "assistant",
                    content: greeting,
                    timestamp: new Date().toISOString(),
                  },
                ]
              : prev,
          );
        }
      })
      .catch(() => {});
    // refreshAgentMe intentionally omitted: it's stable per `token`, already a dependency below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Anonymous threshold gate
      if (!token) {
        const count = parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? "0", 10);
        if (count >= freeQuestionLimit) {
          setShowLoginGate(true);
          return;
        }
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Optimistic update
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const guestId = !token ? getGuestId() : undefined;
        const response = await sendMessage(
          token,
          { message: text.trim(), conversationId: conversationId ?? undefined },
          guestId,
        );

        setConversationId(response.conversationId);

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.reply,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // During onboarding, each turn advances the backend's form state — re-check so we know
        // when it flips to `pending: false` (e.g. to stop treating the conversation specially).
        if (onboardingPending) {
          refreshAgentMe().catch(() => {});
        }

        if (token) {
          // Increment user count after successful response
          const newCount =
            parseInt(localStorage.getItem(USER_COUNT_KEY) ?? "0", 10) + 1;
          localStorage.setItem(USER_COUNT_KEY, String(newCount));
          setUserCount(newCount);
          if (newCount >= upgradePromptLimit) {
            setShowUpgradeGate(true);
          }
        } else {
          // Increment anon count after successful response
          const newCount =
            parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? "0", 10) + 1;
          localStorage.setItem(ANON_COUNT_KEY, String(newCount));
          setAnonCount(newCount);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al enviar el mensaje",
        );
        // Remove optimistic user message on error
        setMessages((prev) => prev.filter((m) => m !== userMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [
      token,
      conversationId,
      freeQuestionLimit,
      upgradePromptLimit,
      onboardingPending,
      refreshAgentMe,
    ],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const conv = await getConversation(token, id);
        setConversationId(conv.id);
        setMessages(conv.messages);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar la conversación",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

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
    onboardingPending,
    setShowLoginGate,
    setShowUpgradeGate,
    sendMessage: send,
    loadConversation,
    startNewConversation,
  };
}
