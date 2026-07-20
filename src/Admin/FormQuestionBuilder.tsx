import { useEffect, useRef } from "react";
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { CreateFormQuestionPayload, FormQuestionConfig } from "@/api/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type QuestionType = FormQuestionConfig["type"];

const QUESTION_TYPES: QuestionType[] = ["text", "date", "number", "select"];

interface FormQuestionBuilderProps {
  questions: CreateFormQuestionPayload[];
  onChange: (questions: CreateFormQuestionPayload[]) => void;
}

function emptyQuestion(): CreateFormQuestionPayload {
  return {
    text: "",
    key: "",
    config: { type: "text", required: true },
  };
}

export function FormQuestionBuilder({
  questions,
  onChange,
}: FormQuestionBuilderProps) {
  // shadcn's `Button` is a plain function component (not wrapped in `forwardRef`), and
  // this project is on React 18 — a `ref` prop on it never attaches. Focus restoration
  // after removing a question is done by querying scoped to this container instead.
  const containerRef = useRef<HTMLDivElement>(null);
  // Set on removeQuestion, consumed by the effect below once React re-renders with the
  // shorter `questions` array — lets us restore focus to a sensible target (the previous
  // card's remove button, or the add button if the first/only card was removed) instead
  // of leaving it stranded on a button that no longer exists.
  const pendingFocusRef = useRef<{ index: number | null; active: boolean }>({
    index: null,
    active: false,
  });

  useEffect(() => {
    if (!pendingFocusRef.current.active) return;
    const { index } = pendingFocusRef.current;
    pendingFocusRef.current = { index: null, active: false };
    const container = containerRef.current;
    if (!container) return;
    if (index !== null) {
      const removeButtons = container.querySelectorAll<HTMLElement>(
        '[data-testid="question-remove"]',
      );
      removeButtons[index]?.focus();
    } else {
      container
        .querySelector<HTMLElement>('[data-testid="question-add"]')
        ?.focus();
    }
  }, [questions]);

  const updateQuestion = (
    index: number,
    patch: Partial<CreateFormQuestionPayload>,
  ) => {
    const next = questions.map((q, i) =>
      i === index ? { ...q, ...patch } : q,
    );
    onChange(next);
  };

  const updateConfig = (
    index: number,
    patch: Partial<NonNullable<CreateFormQuestionPayload["config"]>>,
  ) => {
    const current = questions[index];
    const config = {
      type: "text" as const,
      required: true,
      ...current.config,
      ...patch,
    };
    updateQuestion(index, { config });
  };

  const addQuestion = () => {
    onChange([...questions, emptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    pendingFocusRef.current = {
      index: index > 0 ? index - 1 : null,
      active: true,
    };
    onChange(questions.filter((_, i) => i !== index));
  };

  return (
    <div
      className="space-y-4"
      data-testid="question-builder"
      ref={containerRef}
    >
      {questions.length === 0 && (
        <div
          className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-8 text-center"
          data-testid="question-builder-empty"
        >
          <ListPlus
            className="mx-auto mb-2 size-8 text-neutral-400"
            aria-hidden="true"
          />
          <p className="text-sm text-neutral-500">
            Todavía no hay preguntas. Agrega al menos una.
          </p>
        </div>
      )}

      {questions.map((question, index) => (
        <div
          key={index}
          aria-label={`Pregunta ${index + 1}`}
          className="space-y-4 rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
          data-testid="question-item"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Pregunta {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(index)}
              className="text-red-600 hover:bg-red-50 hover:text-red-600"
              aria-label={`Eliminar pregunta ${index + 1}`}
              data-testid="question-remove"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`question-${index}-text`}>
                Texto de la pregunta
              </Label>
              <Input
                id={`question-${index}-text`}
                type="text"
                value={question.text}
                onChange={(e) =>
                  updateQuestion(index, { text: e.target.value })
                }
                data-testid="question-text"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`question-${index}-key`}>
                Key (identificador)
              </Label>
              <Input
                id={`question-${index}-key`}
                type="text"
                value={question.key}
                onChange={(e) => updateQuestion(index, { key: e.target.value })}
                data-testid="question-key"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor={`question-${index}-type`}>Tipo</Label>
              <Select
                value={question.config?.type ?? "text"}
                onValueChange={(value) =>
                  updateConfig(index, { type: value as QuestionType })
                }
              >
                <SelectTrigger
                  id={`question-${index}-type`}
                  data-testid="question-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-2.5">
              <Checkbox
                id={`question-${index}-required`}
                checked={question.config?.required ?? true}
                onCheckedChange={(checked) =>
                  updateConfig(index, { required: checked === true })
                }
                data-testid="question-required"
              />
              <Label
                htmlFor={`question-${index}-required`}
                className="font-normal"
              >
                Requerida
              </Label>
            </div>

            {question.config?.type === "date" && (
              <div className="flex items-center gap-2 pb-2.5">
                <Checkbox
                  id={`question-${index}-disallow-future`}
                  checked={question.config?.disallowFuture ?? false}
                  onCheckedChange={(checked) =>
                    updateConfig(index, { disallowFuture: checked === true })
                  }
                  data-testid="question-disallow-future"
                />
                <Label
                  htmlFor={`question-${index}-disallow-future`}
                  className="font-normal"
                >
                  No permitir fechas futuras
                </Label>
              </div>
            )}
          </div>

          {question.config?.type === "select" && (
            <div className="space-y-1">
              <Label htmlFor={`question-${index}-options`}>
                Opciones (separadas por coma)
              </Label>
              <Input
                id={`question-${index}-options`}
                type="text"
                value={(question.config?.options ?? []).join(", ")}
                onChange={(e) =>
                  updateConfig(index, {
                    options: e.target.value
                      .split(",")
                      .map((o) => o.trim())
                      .filter((o) => o.length > 0),
                  })
                }
                placeholder="opción 1, opción 2, opción 3"
                data-testid="question-options"
              />
              <p className="text-xs italic text-neutral-500">
                Separá las opciones con comas
              </p>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addQuestion}
        className={cn(
          "border-dashed border-neutral-300 hover:border-primary hover:bg-secondary/40",
        )}
        data-testid="question-add"
      >
        <Plus className="size-4" aria-hidden="true" />
        Agregar pregunta
      </Button>
    </div>
  );
}
