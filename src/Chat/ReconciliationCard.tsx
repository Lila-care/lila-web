import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ReconciliationData } from "@/api/lila";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@lila-care/design-system";

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
      <div
        className="flex gap-2 mb-3 items-end"
        data-testid="reconciliation-success"
      >
        <img
          src="/lila-logo-warm.svg"
          alt="Lila"
          className="w-7 h-7 rounded-full shrink-0 mb-5"
        />
        <div className="max-w-[80%] rounded-[16px] rounded-bl-[4px] px-[17px] py-[13px] text-[15px] leading-[1.5] text-foreground border border-border">
          Gracias por confirmar tus respuestas — ya quedaron guardadas.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2 mb-3 items-end"
      data-testid="reconciliation-card"
    >
      <img
        src="/lila-logo-warm.svg"
        alt="Lila"
        className="w-7 h-7 rounded-full shrink-0 mb-5"
      />
      <Card className="w-full max-w-[80%] min-w-0 px-0 bg-white/70 backdrop-blur-sm border-purple-200/50 [box-shadow:0_8px_32px_rgba(155,114,200,0.15)]">
        <CardHeader className="pb-3 pt-4 px-[18px]">
          <CardTitle className="text-[15px] text-[#9B72C8]">
            Antes de seguir, revisemos lo que ya nos contaste
          </CardTitle>
        </CardHeader>

        <CardContent className="px-[18px] py-0">
          <ul className="flex flex-col gap-3">
            {data.questions.map((q) => {
              const isEditing = editingId === q.questionId;
              const inputId = `reconciliation-answer-${q.questionId}`;

              return (
                <li key={q.questionId} className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground">
                    {q.text}
                  </span>
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
                          className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[14px] text-foreground outline-none border border-[#9B72C8]/40 focus:border-[#9B72C8] disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                          className="shrink-0 text-xs font-medium text-[#9B72C8] disabled:opacity-60"
                        >
                          Listo
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">
                          {answers[q.questionId]}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingId(q.questionId)}
                          disabled={isSaving}
                          aria-label={`Editar respuesta: ${q.text}`}
                          data-testid={`reconciliation-edit-${q.questionId}`}
                          className="shrink-0 p-1 rounded-full transition-colors hover:bg-secondary disabled:opacity-60"
                        >
                          <Pencil size={14} className="text-[#9B72C8]" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {saveState === "error" && (
            <p className="text-xs text-destructive mt-3" role="alert">
              {errorMessage}
            </p>
          )}
        </CardContent>

        <CardFooter className="px-[18px] pt-1 pb-4">
          <Button
            type="button"
            variant="brand"
            size="full"
            onClick={handleSave}
            disabled={isSaving}
            data-testid="reconciliation-confirm"
          >
            {isSaving ? "Guardando..." : "Confirmar y guardar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ReconciliationCard;
