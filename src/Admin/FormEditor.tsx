import { useState } from "react";
import {
  CreateFormPayload,
  CreateFormQuestionPayload,
  FormAudience,
  LilaForm,
  UpdateFormPayload,
} from "@/api/forms";
import { FormQuestionBuilder } from "@/Admin/FormQuestionBuilder";

interface FormEditorProps {
  initialForm?: LilaForm;
  saving: boolean;
  saveError: string | null;
  onCreate: (payload: CreateFormPayload) => void;
  onUpdate: (payload: UpdateFormPayload) => void;
  onCancel: () => void;
}

interface AdvancedAudienceState {
  userIdsRaw: string;
  queryRaw: string;
  queryError: string | null;
}

function parseAudience(state: AdvancedAudienceState): {
  audience: FormAudience | undefined;
  error: string | null;
} {
  const userIds = state.userIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  let query: Record<string, unknown> | undefined;
  if (state.queryRaw.trim().length > 0) {
    try {
      query = JSON.parse(state.queryRaw);
    } catch {
      return {
        audience: undefined,
        error: "El JSON de audience.query no es válido",
      };
    }
  }

  if (userIds.length === 0 && !query) {
    return { audience: undefined, error: null };
  }
  return {
    audience: {
      ...(userIds.length > 0 ? { userIds } : {}),
      ...(query ? { query } : {}),
    },
    error: null,
  };
}

export function FormEditor({
  initialForm,
  saving,
  saveError,
  onCreate,
  onUpdate,
  onCancel,
}: FormEditorProps) {
  const isEditing = !!initialForm;
  const [name, setName] = useState(initialForm?.name ?? "");
  const [description, setDescription] = useState(
    initialForm?.description ?? "",
  );
  const [objective, setObjective] = useState(initialForm?.objective ?? "");
  const [questions, setQuestions] = useState<CreateFormQuestionPayload[]>(
    initialForm?.questions.map(({ text, key, config }) => ({
      text,
      key,
      config,
    })) ?? [],
  );
  const [isDefault, setIsDefault] = useState(initialForm?.isDefault ?? false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [audienceState, setAudienceState] = useState<AdvancedAudienceState>({
    userIdsRaw: initialForm?.audience?.userIds?.join(", ") ?? "",
    queryRaw: initialForm?.audience?.query
      ? JSON.stringify(initialForm.audience.query, null, 2)
      : "",
    queryError: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { audience, error } = parseAudience(audienceState);
    if (error) {
      setAudienceState((prev) => ({ ...prev, queryError: error }));
      return;
    }
    setAudienceState((prev) => ({ ...prev, queryError: null }));

    if (isEditing && initialForm) {
      onUpdate({ name, description, objective, questions, audience });
      return;
    }
    onCreate({ name, description, objective, questions, isDefault });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-2xl"
      data-testid="form-editor"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="form-name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          data-testid="form-description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Objetivo
        </label>
        <input
          type="text"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="form-objective"
        />
      </div>

      {!isEditing && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            data-testid="form-is-default"
          />
          Marcar como form por defecto
        </label>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Preguntas</h3>
        <FormQuestionBuilder questions={questions} onChange={setQuestions} />
      </div>

      {isEditing && (
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm font-medium text-gray-600 hover:underline"
            data-testid="audience-toggle"
          >
            {showAdvanced ? "Ocultar" : "Mostrar"} audiencia (avanzado)
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  IDs de usuario (separados por coma)
                </label>
                <textarea
                  value={audienceState.userIdsRaw}
                  onChange={(e) =>
                    setAudienceState((prev) => ({
                      ...prev,
                      userIdsRaw: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audience-user-ids"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Query (JSON crudo)
                </label>
                <textarea
                  value={audienceState.queryRaw}
                  onChange={(e) =>
                    setAudienceState((prev) => ({
                      ...prev,
                      queryRaw: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder='{ "tier": "clinico" }'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audience-query"
                />
              </div>
              {audienceState.queryError && (
                <p
                  className="text-red-600 text-sm"
                  data-testid="audience-query-error"
                >
                  {audienceState.queryError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {saveError && (
        <p className="text-red-600 text-sm" data-testid="form-save-error">
          {saveError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          data-testid="form-save-button"
        >
          {saving
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Crear borrador"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-6 py-2.5 font-medium text-gray-600 hover:bg-gray-100 transition"
          data-testid="form-cancel-button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
