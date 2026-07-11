import { CreateFormQuestionPayload, FormQuestionConfig } from "@/api/forms";

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
    onChange(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4" data-testid="question-builder">
      {questions.length === 0 && (
        <p
          className="text-sm text-gray-400"
          data-testid="question-builder-empty"
        >
          Todavía no hay preguntas. Agrega al menos una.
        </p>
      )}

      {questions.map((question, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 p-4 space-y-3"
          data-testid="question-item"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Texto de la pregunta
                </label>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) =>
                    updateQuestion(index, { text: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="question-text"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Key (identificador)
                </label>
                <input
                  type="text"
                  value={question.key}
                  onChange={(e) =>
                    updateQuestion(index, { key: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="question-key"
                />
              </div>

              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={question.config?.type ?? "text"}
                    onChange={(e) =>
                      updateConfig(index, {
                        type: e.target.value as QuestionType,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="question-type"
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5">
                  <input
                    type="checkbox"
                    checked={question.config?.required ?? true}
                    onChange={(e) =>
                      updateConfig(index, { required: e.target.checked })
                    }
                    data-testid="question-required"
                  />
                  Requerida
                </label>
              </div>

              {question.config?.type === "select" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Opciones (separadas por coma)
                  </label>
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="opción 1, opción 2, opción 3"
                    data-testid="question-options"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="text-sm text-red-600 hover:underline"
              data-testid="question-remove"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="text-sm font-medium text-primary hover:underline"
        data-testid="question-add"
      >
        + Agregar pregunta
      </button>
    </div>
  );
}
