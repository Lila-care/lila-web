import { useEffect, useState } from "react";
import { Menu, X, Bell, MoreVertical } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { getConversations } from "@/api/lila";
import type { ConversationSummary } from "@/api/lila";
import Sidebar from "@/components/AppShell/Sidebar";
import MobileNav from "@/components/AppShell/MobileNav";
import { useLilaChat } from "./useLilaChat";
import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";
import LoginGateModal from "./LoginGateModal";
import UpgradeGateModal from "./UpgradeGateModal";

function ChatPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    onboardingPending,
    isCheckingOnboarding,
    sendMessage,
    loadConversation,
    startNewConversation,
    confirmReconciliation,
  } = useLilaChat();

  // Load conversations list on mount (only for authenticated users)
  useEffect(() => {
    if (!token) return;
    getConversations(token)
      .then((res) => setConversations(res.conversations))
      .catch(console.error);
  }, [token]);

  // Refresh conversation list when a new conversationId appears
  useEffect(() => {
    if (!token || !conversationId) return;
    getConversations(token)
      .then((res) => setConversations(res.conversations))
      .catch(console.error);
  }, [token, conversationId]);

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    if (!token && messages.length > 0) {
      const confirmed = window.confirm(
        "Esta conversación no se guardó porque no iniciaste sesión. Si cambias de tema ahora, la perderás. ¿Quieres continuar?",
      );
      if (!confirmed) return;
    }
    startNewConversation();
    setSidebarOpen(false);
  };

  const isEmptyState = hasActiveTemplate && messages.length === 0 && !isLoading;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#FAF8FC" }}
    >
      {/* Shell principal — nav Hoy/Chat/Calendario/Aprende/Perfil, compartido con el resto de la app */}
      <Sidebar />
      <MobileNav />

      {/* Rail de conversaciones — específico de /chat, se mantiene independiente del nav principal */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300
          md:relative md:translate-x-0 md:flex md:flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "#F4F0FA",
          borderRight: "1px solid rgba(74,45,110,.07)",
        }}
      >
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            currentId={conversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            isAuthenticated={!!token}
          />
        </div>
      </aside>

      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header — hidden during empty state (EmptyState has its own wordmark + mobile menu) */}
        {!isEmptyState && (
          <header
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(74,45,110,.05)" }}
          >
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: "#6B6377" }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 min-w-0">
              <h1
                className="text-sm font-semibold truncate"
                style={{ color: "#2A2530" }}
              >
                Chat con Lila
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <button
                className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
                style={{ color: "#6B6377" }}
              >
                <Bell size={19} />
              </button>
              <button
                className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
                style={{ color: "#6B6377" }}
              >
                <MoreVertical size={19} />
              </button>
            </div>
          </header>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs text-center">
            {error}
          </div>
        )}

        {/* Chat area */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{ background: "#FAF8FC" }}
        >
          {/* Floating mobile menu button — empty state has its own header without one */}
          {isEmptyState && (
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/80 hover:bg-white shadow-sm transition"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

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
              onboardingPending={onboardingPending}
              isCheckingOnboarding={isCheckingOnboarding}
              onConfirmReconciliation={confirmReconciliation}
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
  );
}

export default ChatPage;
