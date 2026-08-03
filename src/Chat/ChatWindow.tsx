import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import type { ChatMessage } from "@/api/lila";
import MessageBubble from "./MessageBubble";
import EmptyState from "@/components/EmptyState";

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onboardingPending?: boolean;
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
        style={{ background: "#fff", border: "1px solid rgba(74,45,110,.07)" }}
      >
        <div className="flex gap-[5px] items-center">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "#B9A3E3",
              animation: "lilaWDot 1.2s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "#B9A3E3",
              animation: "lilaWDot 1.2s 0.18s infinite ease-in-out",
            }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{
              background: "#B9A3E3",
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
  onboardingPending = false,
  onConfirmReconciliation,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  // Show EmptyState (with suggestion chips) only when there are no messages, not loading, and
  // onboarding isn't pending — during onboarding the greeting message is seeded as the first
  // assistant message instead, so `messages` is never empty in that case.
  if (messages.length === 0 && !isLoading && !onboardingPending) {
    return (
      <div className="flex flex-col h-full">
        <EmptyState onSend={onSend} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-[18px] py-2"
        style={{ background: "#FAF8FC" }}
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
          background: "#FAF8FC",
          borderTop: "1px solid rgba(74,45,110,.05)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 rounded-[26px] bg-white px-2 py-2 pl-[22px] transition-[border-color] duration-150"
          style={{
            border: "1.5px solid transparent",
            boxShadow: "0 2px 16px rgba(74,45,110,.08)",
            fontFamily: "'Poppins', system-ui, sans-serif",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLFormElement).style.borderColor = "#B9A3E3";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLFormElement).style.borderColor =
              "transparent";
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbeme..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-[15px] text-[#2A2530] placeholder:text-[#9B93A6] outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{
              border: "none",
              padding: "11px 0",
              minHeight: "44px",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Enviar"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full disabled:opacity-40 transition-transform duration-150"
            style={{
              background: "#4A2D6E",
              border: "none",
              boxShadow: "0 3px 10px rgba(74,45,110,.28)",
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
            <ArrowUp size={18} color="#ffffff" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;
