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
    <div
      className="flex flex-col h-full"
      style={{
        background: "#F4F0FA",
        borderRight: "1px solid rgba(74,45,110,.07)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-4">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 w-full text-white rounded-xl px-4 py-3 text-sm font-semibold transition-shadow duration-150"
          style={{
            background: "#4A2D6E",
            border: "none",
            boxShadow: "0 4px 12px rgba(74,45,110,.22)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 6px 16px rgba(74,45,110,.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 4px 12px rgba(74,45,110,.22)";
          }}
        >
          <Plus size={16} />
          Cambiemos de tema
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {!isAuthenticated && (
          <p
            className="text-xs text-center mt-8 px-4"
            style={{ color: "#A79FB2" }}
          >
            Inicia sesión para guardar tu historial
          </p>
        )}

        {isAuthenticated && conversations.length === 0 && (
          <p
            className="text-xs text-center mt-8 px-4"
            style={{ color: "#A79FB2" }}
          >
            Aún no tienes conversaciones
          </p>
        )}

        {isAuthenticated &&
          conversations.map((conv) => {
            const active = currentId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-[10px] transition-colors"
                style={{
                  background: active ? "rgba(185,163,227,.24)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (active) return;
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(185,163,227,.12)";
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                <MessageCircle
                  size={16}
                  className="mt-0.5 shrink-0"
                  color={active ? "#4A2D6E" : "#8A8194"}
                />
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: active ? "#4A2D6E" : "#4B4453" }}
                  >
                    {conv.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#A79FB2" }}>
                    {formatDate(conv.createdAt)} · {conv.messageCount}{" "}
                    {conv.messageCount === 1 ? "mensaje" : "mensajes"}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export default ConversationList;
