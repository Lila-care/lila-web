import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/api/lila";
import ReconciliationCard from "./ReconciliationCard";

interface MessageBubbleProps {
  message: ChatMessage;
  onConfirmReconciliation?: (
    formId: string,
    answers: { questionId: string; answerText: string }[],
  ) => Promise<void>;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message, onConfirmReconciliation }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.kind === "reconciliation" && message.data) {
    return (
      <ReconciliationCard
        data={message.data}
        onConfirm={
          onConfirmReconciliation ??
          (() => Promise.reject(new Error("Reconciliación no disponible.")))
        }
      />
    );
  }

  if (isUser) {
    return (
      <div
        className="flex justify-end mb-3"
        data-testid="message-bubble"
        data-role="user"
      >
        <div className="max-w-[80%]">
          <div
            className="rounded-[16px] rounded-br-[4px] px-[17px] py-[13px] text-[15px] leading-[1.5] text-white"
            style={{ background: "#4A2D6E" }}
          >
            {message.content}
          </div>
          <p className="text-xs text-[#8A8194] mt-1 text-right">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2 mb-3 items-end"
      data-testid="message-bubble"
      data-role="assistant"
    >
      <img
        src="/lila-logo-warm.svg"
        alt="Lila"
        className="w-7 h-7 rounded-full shrink-0 mb-5"
      />
      <div className="max-w-[80%]">
        <div
          className="rounded-[16px] rounded-bl-[4px] px-[17px] py-[13px] text-[15px] leading-[1.55] text-[#2A2530] prose prose-sm max-w-none"
          style={{
            background: "#fff",
            border: "1px solid rgba(74,45,110,.07)",
          }}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <p className="text-xs text-[#8A8194] mt-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default MessageBubble;
