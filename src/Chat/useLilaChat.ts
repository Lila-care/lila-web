import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  sendMessage,
  getConversation,
  getConfig,
  getAgentMe,
  reconcileOnboarding,
  LilaUpgradeRequiredError,
} from "@/api/lila";
import type { ChatMessage } from "@/api/lila";
import { getGuestId } from "@/lib/guest";

const ANON_COUNT_KEY = "lila_anon_count";
const ANON_COUNT_DATE_KEY = "lila_anon_count_date";

// Counters are meant to be daily (the upgrade gate says "vuelve mañana"), but they were plain
// localStorage counters with no date attached — once a user hit the threshold it stayed hit
// forever, across any number of days. Stamping each write with the local calendar day and
// treating a stale/missing stamp as "day changed" makes the reset automatic, including for
// counts written before this fix (their date key won't exist, so they reset on first read).
function readDailyCount(countKey: string, dateKey: string): number {
  if (localStorage.getItem(dateKey) !== new Date().toDateString()) return 0;
  return parseInt(localStorage.getItem(countKey) ?? "0", 10);
}

function writeDailyCount(
  countKey: string,
  dateKey: string,
  count: number,
): void {
  localStorage.setItem(countKey, String(count));
  localStorage.setItem(dateKey, new Date().toDateString());
}

interface UseLilaChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  freeQuestionLimit: number;
  upgradePromptLimit: number;
  anonCount: number;
  dailyQuestionCount: number;
  hasActiveSubscription: boolean;
  showLoginGate: boolean;
  showUpgradeGate: boolean;
  hasActiveTemplate: boolean;
  onboardingPending: boolean;
  // True until the mount-time `agent/me` check (which determines `onboardingPending`) has
  // settled — while true, the UI must not offer an interactive composer/chips, since sending a
  // message before this resolves races the backend's onboarding routing (see ChatWindow).
  isCheckingOnboarding: boolean;
  setShowLoginGate: (v: boolean) => void;
  setShowUpgradeGate: (v: boolean) => void;
  // Resolves `false` when the message was blocked (login/upgrade gate) or failed. On `false`
  // this hook has already restored the text into `draftText` itself — the caller doesn't need
  // to re-set it.
  sendMessage: (text: string) => Promise<boolean>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  confirmReconciliation: (
    formId: string,
    answers: { questionId: string; answerText: string }[],
  ) => Promise<void>;
  refreshSubscriptionStatus: () => void;
  // Owned here (not by ChatWindow/EmptyState's own local state) so a blocked/failed send can
  // restore the draft reliably: with zero messages the composer is EmptyState, which fully
  // unmounts and remounts (losing any local state) during the optimistic add-then-remove of
  // the user's message that a rejected send triggers — see `send`'s catch branch below.
  draftText: string;
  setDraftText: (v: string) => void;
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
    readDailyCount(ANON_COUNT_KEY, ANON_COUNT_DATE_KEY),
  );
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [hasActiveTemplate, setHasActiveTemplate] = useState(true);
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  // Authenticated users' daily count and subscription status now come straight from the
  // server (`GET /lila/agent/me`) instead of a client-side localStorage counter — the daily
  // free-message limit is enforced server-side (`POST /lila/chat` 403s past `freeQuestionLimit`
  // for non-subscribers), so the client no longer owns that count for authenticated users.
  const [dailyQuestionCount, setDailyQuestionCount] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [draftText, setDraftText] = useState("");

  // Re-fetches agent/me and syncs the local onboarding flag — reused both on mount and after
  // every turn during onboarding, since the backend has no dedicated "onboarding complete" event.
  const refreshAgentMe = useCallback(async () => {
    const guestId = getGuestId();
    const agent = await getAgentMe(token, token ? undefined : guestId);
    setHasActiveTemplate(agent.hasActiveTemplate);
    setOnboardingPending(agent.onboarding.pending);
    setDailyQuestionCount(agent.dailyQuestionCount);
    setHasActiveSubscription(agent.hasActiveSubscription);
    return agent;
  }, [token]);

  // Fetch config and agent/me on mount; also re-runs on auth change (login/logout).
  // Reset chat state first so stale messages from the previous session never leak through
  // the `prev.length === 0` guards in the message-seeding branches below.
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setIsCheckingOnboarding(true);

    getConfig()
      .then((cfg) => {
        setFreeQuestionLimit(cfg.freeQuestionLimit);
        setUpgradePromptLimit(cfg.upgradePromptLimit);
      })
      .catch(() => {});

    refreshAgentMe()
      .then((agent) => {
        // Priority order (most to least specific): reconciliation > activeConversation >
        // generic greeting. Reconciliation only ever fires post-login with onboarding already
        // completed before, so it can't collide with an in-progress onboarding conversation in
        // practice — but if the backend ever sent both, the pending guest form review still wins.
        // Seeded only while the conversation is still empty, same guard as the branches below.
        if (agent.reconciliation) {
          const { formId, questions } = agent.reconciliation;
          setMessages((prev) =>
            prev.length === 0
              ? [
                  {
                    role: "assistant",
                    content:
                      "Antes de seguir, revisemos lo que ya nos contaste.",
                    timestamp: new Date().toISOString(),
                    kind: "reconciliation",
                    data: { formId, questions },
                  },
                ]
              : prev,
          );
          return;
        }

        // Resume mid-onboarding conversations (guest or authenticated) exactly as they were
        // left on the backend — takes priority over the generic first-question greeting below,
        // since re-showing that greeting on top of a real, already-in-progress exchange is what
        // caused the resume bug (a guest reload showed the first-question greeting again, and
        // her next answer got misinterpreted against the wrong question).
        if (
          agent.activeConversation &&
          agent.activeConversation.messages.length > 0
        ) {
          const restored: ChatMessage[] = agent.activeConversation.messages.map(
            (m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            }),
          );
          setMessages((prev) => (prev.length === 0 ? restored : prev));
          // Functional update: only claim the restored conversationId if the user hasn't
          // already started (and gotten a real one from) a new exchange in the race window
          // before this async response came back.
          setConversationId(
            (prev) => prev ?? agent.activeConversation!.conversationId,
          );
          return;
        }

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
      .catch(() => {})
      .finally(() => setIsCheckingOnboarding(false));
    // refreshAgentMe intentionally omitted: it's stable per `token`, already a dependency below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text.trim()) return false;

      // Anonymous threshold gate — unchanged, guests aren't rate-limited server-side.
      if (!token) {
        const count = readDailyCount(ANON_COUNT_KEY, ANON_COUNT_DATE_KEY);
        if (count >= freeQuestionLimit) {
          setShowLoginGate(true);
          setDraftText(text);
          return false;
        }
      } else if (
        !hasActiveSubscription &&
        dailyQuestionCount >= freeQuestionLimit
      ) {
        // Authenticated, no active subscription, already hit today's server-enforced limit —
        // skip the round trip and show the same gate the 403 below would otherwise trigger.
        setShowUpgradeGate(true);
        setDraftText(text);
        return false;
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
          // Server is the source of truth for the daily count now — refresh agent/me instead
          // of a local counter so `dailyQuestionCount` reflects the message we just sent.
          refreshAgentMe().catch(() => {});
        } else {
          // Anonymous counting is unchanged (client-side only, no server enforcement yet).
          const newCount =
            readDailyCount(ANON_COUNT_KEY, ANON_COUNT_DATE_KEY) + 1;
          writeDailyCount(ANON_COUNT_KEY, ANON_COUNT_DATE_KEY, newCount);
          setAnonCount(newCount);
        }

        return true;
      } catch (err) {
        if (err instanceof LilaUpgradeRequiredError) {
          // The check runs before Claude is called — the message was never persisted and the
          // count was never incremented server-side, so drop the optimistic bubble and restore
          // the draft (owned here, not by whichever composer happens to be mounted) for a retry
          // after upgrading.
          setShowUpgradeGate(true);
          setMessages((prev) => prev.filter((m) => m !== userMessage));
          setDraftText(text);
          return false;
        }

        setError(
          err instanceof Error ? err.message : "Error al enviar el mensaje",
        );
        // Remove optimistic user message on error and restore the draft for a retry.
        setMessages((prev) => prev.filter((m) => m !== userMessage));
        setDraftText(text);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      token,
      conversationId,
      freeQuestionLimit,
      hasActiveSubscription,
      dailyQuestionCount,
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

  // Reconciliation only ever appears for a signed-in first-login (see `agent.reconciliation`
  // above) — a guest session has no token to authorize the endpoint with.
  const confirmReconciliation = useCallback(
    async (
      formId: string,
      answers: { questionId: string; answerText: string }[],
    ) => {
      if (!token) {
        throw new Error(
          "Necesitas iniciar sesión para confirmar tus respuestas.",
        );
      }
      await reconcileOnboarding(token, { formId, answers });
    },
    [token],
  );

  return {
    messages,
    conversationId,
    isLoading,
    error,
    freeQuestionLimit,
    upgradePromptLimit,
    anonCount,
    dailyQuestionCount,
    hasActiveSubscription,
    showLoginGate,
    showUpgradeGate,
    hasActiveTemplate,
    onboardingPending,
    isCheckingOnboarding,
    setShowLoginGate,
    setShowUpgradeGate,
    sendMessage: send,
    loadConversation,
    startNewConversation,
    confirmReconciliation,
    refreshSubscriptionStatus: () => {
      refreshAgentMe().catch(() => {});
    },
    draftText,
    setDraftText,
  };
}
