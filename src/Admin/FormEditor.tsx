import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  CreateFormPayload,
  CreateFormQuestionPayload,
  FormAudience,
  LilaForm,
  UpdateFormPayload,
} from "@/api/forms";
import { FormQuestionBuilder } from "@/Admin/FormQuestionBuilder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

// Shared focus treatment mandated by the design spec for text fields in this editor:
// change the border color too, not just the ring, so the active field is unambiguous.
const FIELD_FOCUS_CLASSES =
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary";

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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
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
      className="max-w-3xl space-y-6"
      data-testid="form-editor"
    >
      <SectionCard title="Información general">
        <div className="space-y-1">
          <Label htmlFor="form-name">Nombre</Label>
          <Input
            id="form-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={FIELD_FOCUS_CLASSES}
            data-testid="form-name"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="form-description">Descripción</Label>
          <Textarea
            id="form-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cn("resize-y", FIELD_FOCUS_CLASSES)}
            data-testid="form-description"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="form-objective">Objetivo</Label>
          <Input
            id="form-objective"
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className={FIELD_FOCUS_CLASSES}
            data-testid="form-objective"
          />
        </div>

        {!isEditing && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="form-is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                data-testid="form-is-default"
              />
              <Label htmlFor="form-is-default" className="font-normal">
                Marcar como form por defecto
              </Label>
            </div>
            <p className="pl-6 text-xs text-neutral-500">
              Este form se le va a mostrar automáticamente a las usuarias nuevas
              al loguearse.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Preguntas">
        <FormQuestionBuilder questions={questions} onChange={setQuestions} />
      </SectionCard>

      {isEditing && (
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                data-testid="audience-toggle"
              >
                Audiencia (avanzado)
                {showAdvanced ? (
                  <ChevronUp className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-4" aria-hidden="true" />
                )}
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="audience-user-ids">
                  IDs de usuario (separados por coma)
                </Label>
                <Textarea
                  id="audience-user-ids"
                  value={audienceState.userIdsRaw}
                  onChange={(e) =>
                    setAudienceState((prev) => ({
                      ...prev,
                      userIdsRaw: e.target.value,
                    }))
                  }
                  rows={2}
                  className="font-mono"
                  data-testid="audience-user-ids"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="audience-query">Query (JSON crudo)</Label>
                <Textarea
                  id="audience-query"
                  value={audienceState.queryRaw}
                  onChange={(e) =>
                    setAudienceState((prev) => ({
                      ...prev,
                      queryRaw: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder='{ "tier": "clinico" }'
                  className="font-mono"
                  data-testid="audience-query"
                />
              </div>
              {audienceState.queryError && (
                <p
                  className="rounded-r-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700"
                  data-testid="audience-query-error"
                >
                  {audienceState.queryError}
                </p>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {saveError && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription data-testid="form-save-error">
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} data-testid="form-save-button">
          {saving && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {saving
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Crear borrador"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          data-testid="form-cancel-button"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
