import Sidebar from "@/components/AppShell/Sidebar";
import MobileNav from "@/components/AppShell/MobileNav";
import { useLilaChat } from "./useLilaChat";
import ChatWindow from "./ChatWindow";
import LoginGateModal from "./LoginGateModal";
import UpgradeGateModal from "./UpgradeGateModal";

function ChatHeader() {
  return (
    <header
      className="flex items-center gap-3 pb-4 shrink-0 border-b border-solid"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div
        className="flex items-center justify-center rounded-[18px] shrink-0"
        style={{ width: 36, height: 36, background: "var(--surface-muted)" }}
      >
        <img src="/lila-logo-warm.svg" alt="" className="w-5 h-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p
          className="text-base font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Chat con Lila
        </p>
        <div className="flex items-center gap-1">
          <span
            className="size-1.5 rounded-full"
            style={{ background: "#34d399" }}
          />
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            En línea para escucharte
          </p>
        </div>
      </div>
    </header>
  );
}

function ChatPage() {
  const {
    messages,
    isLoading,
    error,
    showLoginGate,
    setShowLoginGate,
    showUpgradeGate,
    setShowUpgradeGate,
    freeQuestionLimit,
    upgradePromptLimit,
    hasActiveTemplate,
    isCheckingOnboarding,
    sendMessage,
    confirmReconciliation,
  } = useLilaChat();

  const isEmptyState = hasActiveTemplate && messages.length === 0 && !isLoading;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--surface-brand-light)" }}
    >
      {/* Shell principal — nav Hoy/Chat/Calendario/Aprende, compartido con el resto de la app */}
      <Sidebar />
      <MobileNav />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <div
          className="flex flex-col flex-1 min-w-0 m-4 md:m-8 p-0"
          style={{
            background: isEmptyState ? "transparent" : "var(--surface-default)",
          }}
        >
          {!isEmptyState && (
            <div className="px-4 pt-4 md:px-0 md:pt-0">
              <ChatHeader />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          {/* Chat area */}
          <div className="relative flex-1 overflow-hidden">
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
                isCheckingOnboarding={isCheckingOnboarding}
                onConfirmReconciliation={confirmReconciliation}
              />
            )}
          </div>
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
