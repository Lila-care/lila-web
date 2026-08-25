import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { ArrowUp, Mic, Paperclip } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import type { ChatMessage } from "@/api/lila";
import MessageBubble from "./MessageBubble";
import EmptyState from "@/components/EmptyState";

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  // True until the initial `agent/me` onboarding check (mount-time) has resolved. While true,
  // neither EmptyState nor its chips/composer must render — sending before this resolves races
  // the backend into skipping onboarding for the user's first message (see useLilaChat).
  isCheckingOnboarding?: boolean;
  onConfirmReconciliation?: (
    formId: string,
    answers: { questionId: string; answerText: string }[],
  ) => Promise<void>;
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-3 items-end">
      <img
        src="/lila-logo-warm.svg"
        alt="Lila"
        className="w-7 h-7 rounded-full shrink-0"
      />
      <div
        className="rounded-[16px] rounded-bl-[4px] px-[18px] py-[15px]"
        style={{
          background: "var(--surface-brand-medium)",
        }}
      >
        <div className="flex gap-[5px] items-center">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s 0.18s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s 0.36s infinite ease-in-out",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes lilaWDot {
          0%, 80%, 100% { transform: translateY(0); opacity: .45; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ChatWindow({
  messages,
  isLoading,
  onSend,
  isCheckingOnboarding = false,
  onConfirmReconciliation,
}: ChatWindowProps) {
  const { token, name } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoadingRender = useRef(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // `disabled={isLoading}` below force-blurs the textarea the instant a send starts (browsers
  // drop focus from a control as soon as it's disabled) and nothing restores it afterwards —
  // reported as "se pierde el foco del input" after pressing Enter to send. Skip the mount-time
  // render so this doesn't steal focus from something else when the page first loads.
  useEffect(() => {
    if (isInitialLoadingRender.current) {
      isInitialLoadingRender.current = false;
      return;
    }
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Before `agent/me` resolves, `onboardingPending` is indistinguishable from "checked and
  // confirmed not pending" (both are `false`) — rendering EmptyState here would let the user
  // send a message or click a suggestion chip that races the backend's onboarding routing.
  // Render nothing interactive until the real state is known.
  if (messages.length === 0 && !isLoading && isCheckingOnboarding) {
    return (
      <div
        data-testid="onboarding-check-loading"
        className="flex h-full items-center justify-center"
      >
        <div className="flex gap-[5px] items-center">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s 0.18s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "var(--brand-primary)",
              animation: "lilaWDot 1.2s 0.36s infinite ease-in-out",
            }}
          />
        </div>
        <style>{`
          @keyframes lilaWDot {
            0%, 80%, 100% { transform: translateY(0); opacity: .45; }
            40% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Show EmptyState (with suggestion chips) whenever there are no messages and we're not
  // loading. For authenticated onboarding, the greeting is seeded as the first assistant
  // message (see useLilaChat), so `messages` is already non-empty by the time we get here and
  // this branch is skipped naturally — no need to check `onboardingPending` directly. Guests
  // are never seeded a greeting, so they land here and see the guest empty state instead.
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        <EmptyState
          onSend={onSend}
          isAuthenticated={!!token}
          userName={name}
          onCreateAccount={() => navigate("/login")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-[18px] py-2"
        style={{ background: "var(--surface-default)" }}
      >
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            onConfirmReconciliation={onConfirmReconciliation}
          />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3"
        style={{
          background: "var(--surface-default)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-4 rounded-[20px] px-5 transition-[border-color] duration-150"
          style={{
            height: 64,
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            boxShadow: "0px 8px 12px rgba(124,58,237,0.06)",
            fontFamily: "'Poppins', system-ui, sans-serif",
          }}
        >
          <Paperclip size={20} color="var(--text-secondary)" />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbeme..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{
              border: "none",
              padding: "11px 0",
              minHeight: "44px",
              fontFamily: "inherit",
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          />
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-[18px]"
              style={{
                width: 36,
                height: 36,
                background: "var(--surface-muted)",
              }}
            >
              <Mic size={16} color="var(--brand-primary)" />
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Enviar"
              className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full disabled:opacity-40 transition-transform duration-150"
              style={{
                background: "var(--brand-primary)",
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (!input.trim() || isLoading) return;
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
            >
              <ArrowUp size={16} color="var(--text-on-brand)" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;
