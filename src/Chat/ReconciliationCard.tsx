import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ReconciliationData } from "@/api/lila";

interface ReconciliationCardProps {
  data: ReconciliationData;
  onConfirm: (
    formId: string,
    answers: { questionId: string; answerText: string }[],
  ) => Promise<void>;
}

type SaveState = "idle" | "saving" | "success" | "error";

function ReconciliationCard({ data, onConfirm }: ReconciliationCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.questions.map((q) => [q.questionId, q.answerText])),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSaving = saveState === "saving";

  const handleSave = async () => {
    setSaveState("saving");
    setErrorMessage(null);
    try {
      await onConfirm(
        data.formId,
        data.questions.map((q) => ({
          questionId: q.questionId,
          answerText: answers[q.questionId],
        })),
      );
      setEditingId(null);
      setSaveState("success");
    } catch (err) {
      setSaveState("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No pudimos guardar tus respuestas. Intenta de nuevo.",
      );
    }
  };

  if (saveState === "success") {
    return (
      <div className="flex gap-2 mb-3 items-end" data-testid="reconciliation-success">
        <img
          src="/lila-logo-warm.svg"
          alt="Lila"
          className="w-7 h-7 rounded-full shrink-0 mb-5"
        />
        <div
          className="max-w-[80%] rounded-[16px] rounded-bl-[4px] px-[17px] py-[13px] text-[15px] leading-[1.5] text-[#2A2530]"
          style={{ background: "#fff", border: "1px solid rgba(74,45,110,.07)" }}
        >
          Gracias por confirmar tus respuestas — ya quedaron guardadas.
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-3 items-end" data-testid="reconciliation-card">
      <img
        src="/lila-logo-warm.svg"
        alt="Lila"
        className="w-7 h-7 rounded-full shrink-0 mb-5"
      />
      <div
        className="w-full max-w-[80%] min-w-0 rounded-2xl px-[18px] py-4"
        style={{ background: "#fff", boxShadow: "0 2px 16px rgba(74,45,110,.08)" }}
      >
        <p className="text-[15px] font-medium text-[#4A2D6E] mb-3">
          Antes de seguir, revisemos lo que ya nos contaste
        </p>

        <ul className="flex flex-col gap-3">
          {data.questions.map((q) => {
            const isEditing = editingId === q.questionId;
            const inputId = `reconciliation-answer-${q.questionId}`;

            return (
              <li key={q.questionId} className="flex flex-col gap-1 min-w-0">
                <span className="text-xs text-[#8A8194]">{q.text}</span>
                <div className="flex items-center gap-2 min-w-0">
                  {isEditing ? (
                    <>
                      <label htmlFor={inputId} className="sr-only">
                        {q.text}
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        value={answers[q.questionId]}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.questionId]: e.target.value,
                          }))
                        }
                        disabled={isSaving}
                        autoFocus
                        data-testid={`reconciliation-input-${q.questionId}`}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[14px] text-[#2A2530] outline-none disabled:opacity-60"
                        style={{ border: "1.5px solid #B9A3E3" }}
                      />
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isSaving}
                        className="shrink-0 text-xs font-medium disabled:opacity-60"
                        style={{ color: "#9B72C8" }}
                      >
                        Listo
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-[#2A2530]">
                        {answers[q.questionId]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(q.questionId)}
                        disabled={isSaving}
                        aria-label={`Editar respuesta: ${q.text}`}
                        data-testid={`reconciliation-edit-${q.questionId}`}
                        className="shrink-0 p-1 rounded-full transition-colors hover:bg-[#F4F0FA] disabled:opacity-60"
                      >
                        <Pencil size={14} color="#9B72C8" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {saveState === "error" && (
          <p className="text-xs text-red-600 mt-3" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="reconciliation-confirm"
          className="mt-4 w-full rounded-full py-2.5 text-[14px] font-medium text-white transition-transform duration-150 disabled:opacity-60"
          style={{ background: "#4A2D6E", border: "none" }}
        >
          {isSaving ? "Guardando..." : "Confirmar y guardar"}
        </button>
      </div>
    </div>
  );
}

export default ReconciliationCard;
