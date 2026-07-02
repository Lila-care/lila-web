import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/api/lila";

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div
        className="flex justify-end mb-3"
        data-testid="message-bubble"
        data-role="user"
      >
        <div className="max-w-[80%]">
          <div
            className="rounded-[20px] rounded-br-[6px] px-[17px] py-[13px] text-[15.5px] leading-[1.5] text-white"
            style={{ background: "#B89FE8" }}
          >
            {message.content}
          </div>
          <p className="text-xs text-[#7c6383] mt-1 text-right">
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
          className="rounded-[20px] rounded-bl-[6px] px-[17px] py-[13px] text-[15.5px] leading-[1.5] text-[#3D1F47] prose prose-sm max-w-none"
          style={{ background: "#F4ECFD" }}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <p className="text-xs text-[#7c6383] mt-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default MessageBubble;
