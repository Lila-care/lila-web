import { KeyboardEvent, RefObject } from "react";
import { ArrowUp, Loader2, Mic, Paperclip } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  textareaRef?: RefObject<HTMLTextAreaElement>;
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Escríbeme...",
  textareaRef,
}: ComposerProps) {
  const canSend = !!value.trim() && !disabled;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
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
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full p-0 disabled:opacity-40 transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
          style={{
            background: "var(--brand-primary)",
            border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => {
            if (!canSend) return;
            (e.currentTarget as HTMLButtonElement).style.transform =
              "scale(1.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "";
          }}
        >
          {disabled ? (
            <Loader2
              size={16}
              color="var(--text-on-brand)"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowUp size={16} color="var(--text-on-brand)" aria-hidden="true" />
          )}
        </button>
      </div>
    </form>
  );
}
