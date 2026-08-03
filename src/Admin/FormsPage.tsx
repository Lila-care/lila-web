import { useState } from "react";
import AdminLayout from "@/Admin/AdminLayout";
import { useForms } from "@/Admin/useForms";
import { useFormEditor } from "@/Admin/useFormEditor";
import { FormsTable } from "@/Admin/FormsTable";
import { FormEditor } from "@/Admin/FormEditor";
import { FormStatusBadge } from "@/Admin/FormStatusBadge";
import { LilaForm, UpdateFormPayload } from "@/api/forms";

type ViewMode =
  { kind: "list" } | { kind: "create" } | { kind: "detail"; formId: string };

function FormsPage() {
  const { forms, loading, error, refetch } = useForms();
  const [view, setView] = useState<ViewMode>({ kind: "list" });
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [unpublishConfirmId, setUnpublishConfirmId] = useState<string | null>(
    null,
  );

  const selectedFormId = view.kind === "detail" ? view.formId : null;
  const editor = useFormEditor(selectedFormId);

  const handleCreated = async () => {
    refetch();
    setView({ kind: "list" });
  };

  const handleUpdated = async () => {
    refetch();
  };

  const handlePublish = async (formId: string) => {
    await editor.publish(formId);
    setPublishConfirmId(null);
    refetch();
  };

  const handleUnpublish = async (formId: string) => {
    await editor.unpublish(formId);
    setUnpublishConfirmId(null);
    refetch();
  };

  return (
    <AdminLayout>
      <div className="min-h-full bg-white p-10" data-testid="forms-page">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Forms</h1>
          {view.kind === "list" && (
            <button
              onClick={() => setView({ kind: "create" })}
              className="bg-primary text-white rounded-lg px-5 py-2.5 font-medium hover:opacity-90 transition"
              data-testid="forms-create-button"
            >
              + Nuevo form
            </button>
          )}
          {view.kind !== "list" && (
            <button
              onClick={() => setView({ kind: "list" })}
              className="text-sm font-medium text-gray-600 hover:underline"
              data-testid="forms-back-button"
            >
              ← Volver a la lista
            </button>
          )}
        </div>

        {view.kind === "list" && (
          <ListSection
            loading={loading}
            error={error}
            forms={forms}
            onSelect={(formId) => setView({ kind: "detail", formId })}
            onRetry={refetch}
          />
        )}

        {view.kind === "create" && (
          <FormEditor
            saving={editor.saving}
            saveError={editor.saveError}
            onCreate={async (payload) => {
              const created = await editor.create(payload);
              if (created) handleCreated();
            }}
            onUpdate={() => {}}
            onCancel={() => setView({ kind: "list" })}
          />
        )}

        {view.kind === "detail" && (
          <DetailSection
            loading={editor.loading}
            loadError={editor.loadError}
            saving={editor.saving}
            saveError={editor.saveError}
            form={editor.form}
            publishConfirmId={publishConfirmId}
            onRequestPublish={(formId) => setPublishConfirmId(formId)}
            onCancelPublish={() => setPublishConfirmId(null)}
            onConfirmPublish={handlePublish}
            unpublishConfirmId={unpublishConfirmId}
            onRequestUnpublish={(formId) => setUnpublishConfirmId(formId)}
            onCancelUnpublish={() => setUnpublishConfirmId(null)}
            onConfirmUnpublish={handleUnpublish}
            onUpdate={async (payload) => {
              if (!editor.form) return;
              const updated = await editor.update(editor.form.formId, payload);
              if (updated) handleUpdated();
            }}
            onCancelEdit={() => setView({ kind: "list" })}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// --- Sub-sections (kept in this file: thin orchestration wrappers around the shared
// list/editor components, not reusable outside FormsPage) ---

interface ListSectionProps {
  loading: boolean;
  error: string | null;
  forms: LilaForm[];
  onSelect: (formId: string) => void;
  onRetry: () => void;
}

function ListSection({
  loading,
  error,
  forms,
  onSelect,
  onRetry,
}: ListSectionProps) {
  if (loading) {
    return (
      <p className="text-gray-500" data-testid="forms-loading">
        Cargando forms...
      </p>
    );
  }

  if (error) {
    return (
      <div data-testid="forms-error">
        <p className="text-red-600 mb-3">Error al cargar los forms: {error}</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-16" data-testid="forms-empty">
        <p className="text-gray-500 mb-1">Todavía no hay forms creados.</p>
        <p className="text-gray-400 text-sm">
          Usa &quot;+ Nuevo form&quot; para crear el primero como borrador.
        </p>
      </div>
    );
  }

  return <FormsTable data={forms} onSelectForm={onSelect} />;
}

interface DetailSectionProps {
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  saveError: string | null;
  form: LilaForm | null;
  publishConfirmId: string | null;
  onRequestPublish: (formId: string) => void;
  onCancelPublish: () => void;
  onConfirmPublish: (formId: string) => void;
  unpublishConfirmId: string | null;
  onRequestUnpublish: (formId: string) => void;
  onCancelUnpublish: () => void;
  onConfirmUnpublish: (formId: string) => void;
  onUpdate: (payload: UpdateFormPayload) => void;
  onCancelEdit: () => void;
}

function DetailSection({
  loading,
  loadError,
  saving,
  saveError,
  form,
  publishConfirmId,
  onRequestPublish,
  onCancelPublish,
  onConfirmPublish,
  unpublishConfirmId,
  onRequestUnpublish,
  onCancelUnpublish,
  onConfirmUnpublish,
  onUpdate,
  onCancelEdit,
}: DetailSectionProps) {
  if (loading) {
    return (
      <p className="text-gray-500" data-testid="form-detail-loading">
        Cargando form...
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-red-600" data-testid="form-detail-error">
        Error al cargar el form: {loadError}
      </p>
    );
  }

  if (!form) {
    return (
      <p className="text-gray-400" data-testid="form-detail-empty">
        Este form no existe.
      </p>
    );
  }

  const isDraft = form.status === "draft";

  return (
    <div className="space-y-6" data-testid="form-detail">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">{form.name}</h2>
        <FormStatusBadge status={form.status} />
      </div>

      {!isDraft && (
        <p className="text-sm text-gray-400" data-testid="form-readonly-note">
          Este form es de solo lectura porque su estado es &quot;{form.status}
          &quot;. Solo los forms en borrador se pueden editar.
        </p>
      )}

      {isDraft ? (
        <>
          <FormEditor
            initialForm={form}
            saving={saving}
            saveError={saveError}
            onCreate={() => {}}
            onUpdate={onUpdate}
            onCancel={onCancelEdit}
          />

          {publishConfirmId === form.formId ? (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
              data-testid="publish-confirm"
            >
              <p className="text-sm text-amber-800">
                ¿Publicar este form? Pasará de borrador a estado
                &quot;live&quot; y ya no se podrá editar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onConfirmPublish(form.formId)}
                  disabled={saving}
                  className="bg-primary text-white rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  data-testid="publish-confirm-button"
                >
                  {saving ? "Publicando..." : "Sí, publicar"}
                </button>
                <button
                  onClick={onCancelPublish}
                  className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                  data-testid="publish-cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onRequestPublish(form.formId)}
              className="bg-green-600 text-white rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition"
              data-testid="publish-button"
            >
              Publicar
            </button>
          )}
        </>
      ) : (
        <>
          <ReadOnlyFormSummary form={form} />

          {form.status === "live" &&
            (unpublishConfirmId === form.formId ? (
              <div
                className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
                data-testid="unpublish-confirm"
              >
                <p className="text-sm text-amber-800">
                  {form.isDefault
                    ? "¿Pasar este form a borrador? Mientras esté en borrador, ninguna usuaria nueva verá el onboarding al loguearse, y las que estén a mitad de encuesta en este momento quedarán huérfanas hasta que se vuelva a publicar de nuevo."
                    : '¿Pasar este form a borrador? Volverá a ser editable y dejará de estar disponible como "live".'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => onConfirmUnpublish(form.formId)}
                    disabled={saving}
                    className="bg-primary text-white rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                    data-testid="unpublish-confirm-button"
                  >
                    {saving ? "Pasando a borrador..." : "Sí, pasar a borrador"}
                  </button>
                  <button
                    onClick={onCancelUnpublish}
                    className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                    data-testid="unpublish-cancel-button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onRequestUnpublish(form.formId)}
                className="bg-green-600 text-white rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition"
                data-testid="unpublish-button"
              >
                Pasar a borrador
              </button>
            ))}
        </>
      )}
    </div>
  );
}

function ReadOnlyFormSummary({ form }: { form: LilaForm }) {
  return (
    <div className="space-y-4 max-w-2xl" data-testid="form-readonly-summary">
      <p className="text-gray-700">{form.description}</p>
      <p className="text-sm text-gray-500">Objetivo: {form.objective}</p>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Preguntas ({form.questions.length})
        </h3>
        <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
          {form.questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FormsPage;
