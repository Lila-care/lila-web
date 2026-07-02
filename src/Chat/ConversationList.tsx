import { Plus, MessageCircle } from "lucide-react";
import type { ConversationSummary } from "@/api/lila";

interface ConversationListProps {
  conversations: ConversationSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isAuthenticated: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function ConversationList({
  conversations,
  currentId,
  onSelect,
  onNew,
  isAuthenticated,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full bg-secondary border-r border-gray-100">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90"
          style={{
            background: "#5C3564",
            border: "none",
            borderBottom: "4px solid rgba(0,0,0,0.22)",
            transform: "translateY(0)",
            transition: "transform 0.08s ease, opacity 0.15s ease-out",
          }}
          onMouseDown={(e) => {
            const el = e.currentTarget;
            el.style.transform = "translateY(3px)";
            el.style.borderBottomWidth = "1px";
          }}
          onMouseUp={(e) => {
            const el = e.currentTarget;
            el.style.transform = "translateY(0)";
            el.style.borderBottomWidth = "4px";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.transform = "translateY(0)";
            el.style.borderBottomWidth = "4px";
          }}
        >
          <Plus size={16} />
          Cambiemos de tema
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {!isAuthenticated && (
          <p className="text-gray-400 text-xs text-center mt-8 px-4">
            Inicia sesión para guardar tu historial
          </p>
        )}

        {isAuthenticated && conversations.length === 0 && (
          <p className="text-gray-400 text-xs text-center mt-8 px-4">
            Aún no tienes conversaciones
          </p>
        )}

        {isAuthenticated &&
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/60 transition rounded-xl mx-1"
              style={
                currentId === conv.id ? { background: "#EFE6FB" } : undefined
              }
            >
              <MessageCircle
                size={16}
                className={`mt-0.5 shrink-0 ${currentId === conv.id ? "text-primary" : "text-gray-400"}`}
              />
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${currentId === conv.id ? "text-primary" : "text-gray-700"}`}
                >
                  {conv.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {formatDate(conv.createdAt)} · {conv.messageCount}{" "}
                  {conv.messageCount === 1 ? "mensaje" : "mensajes"}
                </p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}

export default ConversationList;
