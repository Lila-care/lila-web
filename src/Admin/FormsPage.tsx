import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Plus,
} from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useForms } from "@/Admin/useForms";
import { useFormEditor } from "@/Admin/useFormEditor";
import { FormsTable } from "@/Admin/FormsTable";
import { FormEditor } from "@/Admin/FormEditor";
import { FormStatusBadge } from "@/Admin/FormStatusBadge";
import { LilaForm, UpdateFormPayload } from "@/api/forms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lila-care/design-system";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode =
  { kind: "list" } | { kind: "create" } | { kind: "detail"; formId: string };

function FormsPage() {
  const { forms, loading, error, refetch } = useForms();
  const [view, setView] = useState<ViewMode>({ kind: "list" });
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [unpublishConfirmId, setUnpublishConfirmId] = useState<string | null>(
    null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selectedFormId = view.kind === "detail" ? view.formId : null;
  const editor = useFormEditor(selectedFormId);

  // Reorients screen reader users to the top of the page whenever the view switches
  // between list/create/detail, since the content below the H1 changes completely.
  useEffect(() => {
    headingRef.current?.focus();
  }, [view.kind]);

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
      <div
        className="min-h-full bg-neutral-50 px-10 py-8"
        data-testid="forms-page"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-semibold text-neutral-900 outline-none"
              >
                Forms
              </h1>
              <p className="text-sm text-neutral-600">
                Administrá los forms de onboarding de Lila.
              </p>
            </div>
            {view.kind === "list" && (
              <Button
                onClick={() => setView({ kind: "create" })}
                data-testid="forms-create-button"
              >
                <Plus className="size-4" aria-hidden="true" />
                Nuevo form
              </Button>
            )}
            {view.kind !== "list" && (
              <Button
                variant="ghost"
                onClick={() => setView({ kind: "list" })}
                data-testid="forms-back-button"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver a la lista
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
            {view.kind === "list" && (
              <ListSection
                loading={loading}
                error={error}
                forms={forms}
                onSelect={(formId) => setView({ kind: "detail", formId })}
                onRetry={refetch}
                onCreate={() => setView({ kind: "create" })}
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
                  const updated = await editor.update(
                    editor.form.formId,
                    payload,
                  );
                  if (updated) handleUpdated();
                }}
                onCancelEdit={() => setView({ kind: "list" })}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// --- Sub-sections (kept in this file: thin orchestration wrappers around the shared
// list/editor components, not reusable outside FormsPage) ---

const TABLE_COLUMN_HEADERS = [
  "Nombre",
  "Objetivo",
  "Estado",
  "Versión",
  "Preguntas",
];
const SKELETON_ROW_WIDTHS = ["w-32", "w-48", "w-20", "w-10", "w-8"];

function TableLoadingSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm"
      data-testid="forms-loading"
    >
      <Table aria-label="Cargando forms">
        <TableHeader className="bg-secondary">
          <TableRow>
            {TABLE_COLUMN_HEADERS.map((header) => (
              <TableHead
                key={header}
                className="text-xs font-semibold uppercase tracking-wide text-neutral-600"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {SKELETON_ROW_WIDTHS.map((width, colIndex) => (
                <TableCell key={colIndex} className="py-4">
                  <Skeleton className={`h-4 ${width}`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ListSectionProps {
  loading: boolean;
  error: string | null;
  forms: LilaForm[];
  onSelect: (formId: string) => void;
  onRetry: () => void;
  onCreate: () => void;
}

function ListSection({
  loading,
  error,
  forms,
  onSelect,
  onRetry,
  onCreate,
}: ListSectionProps) {
  if (loading) {
    return <TableLoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="rounded-xl border-red-200 bg-red-50 p-4"
        aria-live="polite"
        data-testid="forms-error"
      >
        <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
        <AlertDescription className="text-red-700">
          <p>Error al cargar los forms: {error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (forms.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-16 text-center"
        data-testid="forms-empty"
      >
        <ClipboardList
          className="mx-auto mb-3 size-12 text-neutral-400"
          aria-hidden="true"
        />
        <p className="mb-1 text-sm font-medium text-neutral-700">
          Todavía no hay forms creados.
        </p>
        <p className="mb-4 text-sm text-neutral-500">
          Usa &quot;Nuevo form&quot; para crear el primero como borrador.
        </p>
        <Button onClick={onCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo form
        </Button>
      </div>
    );
  }

  return <FormsTable data={forms} onSelectForm={onSelect} />;
}

function DetailLoadingSkeleton() {
  return (
    <div className="max-w-2xl space-y-6" data-testid="form-detail-loading">
      <Skeleton className="h-7 w-64" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
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
    return <DetailLoadingSkeleton />;
  }

  if (loadError) {
    // No retry action here: `useFormEditor` (out of this feature's scope) doesn't expose
    // a way to re-trigger the load for the same formId without changing view state, so a
    // "Reintentar" button here would be decorative. Kept as a plain destructive Alert.
    return (
      <Alert
        variant="destructive"
        className="rounded-xl border-red-200 bg-red-50 p-4"
        aria-live="polite"
        data-testid="form-detail-error"
      >
        <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
        <AlertDescription className="text-red-700">
          Error al cargar el form: {loadError}
        </AlertDescription>
      </Alert>
    );
  }

  if (!form) {
    return (
      <div
        className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-16 text-center"
        data-testid="form-detail-empty"
      >
        <ClipboardList
          className="mx-auto mb-3 size-12 text-neutral-400"
          aria-hidden="true"
        />
        <p className="text-sm text-neutral-500">Este form no existe.</p>
      </div>
    );
  }

  const isDraft = form.status === "draft";

  return (
    <div className="space-y-6" data-testid="form-detail">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-neutral-900">{form.name}</h2>
        <FormStatusBadge status={form.status} />
      </div>

      {!isDraft && (
        <p
          className="text-sm text-neutral-500"
          data-testid="form-readonly-note"
        >
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

          <Button
            className="bg-green-600 hover:bg-green-600/90"
            onClick={() => onRequestPublish(form.formId)}
            data-testid="publish-button"
          >
            Publicar
          </Button>

          <AlertDialog
            open={publishConfirmId === form.formId}
            onOpenChange={(open) => !open && onCancelPublish()}
          >
            <AlertDialogContent data-testid="publish-confirm">
              <AlertDialogHeader>
                <AlertTriangle
                  className="mx-auto size-8 text-amber-600"
                  aria-hidden="true"
                />
                <AlertDialogTitle>¿Publicar este form?</AlertDialogTitle>
                <AlertDialogDescription>
                  Pasará de borrador a estado &quot;live&quot; y ya no se podrá
                  editar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="publish-cancel-button">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving}
                  onClick={() => onConfirmPublish(form.formId)}
                  data-testid="publish-confirm-button"
                >
                  {saving ? "Publicando..." : "Sí, publicar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <ReadOnlyFormSummary form={form} />

          {form.status === "live" && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-600/90"
                onClick={() => onRequestUnpublish(form.formId)}
                data-testid="unpublish-button"
              >
                Pasar a borrador
              </Button>

              <AlertDialog
                open={unpublishConfirmId === form.formId}
                onOpenChange={(open) => !open && onCancelUnpublish()}
              >
                <AlertDialogContent data-testid="unpublish-confirm">
                  <AlertDialogHeader>
                    <AlertTriangle
                      className="mx-auto size-8 text-amber-600"
                      aria-hidden="true"
                    />
                    <AlertDialogTitle>
                      ¿Pasar este form a borrador?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {form.isDefault
                        ? "Mientras esté en borrador, ninguna usuaria nueva verá el onboarding al loguearse, y las que estén a mitad de encuesta en este momento quedarán huérfanas hasta que se vuelva a publicar de nuevo."
                        : 'Volverá a ser editable y dejará de estar disponible como "live".'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="unpublish-cancel-button">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={saving}
                      onClick={() => onConfirmUnpublish(form.formId)}
                      data-testid="unpublish-confirm-button"
                    >
                      {saving
                        ? "Pasando a borrador..."
                        : "Sí, pasar a borrador"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReadOnlyFormSummary({ form }: { form: LilaForm }) {
  return (
    <div className="max-w-2xl space-y-4" data-testid="form-readonly-summary">
      <div>
        <p className="text-xs font-semibold uppercase text-neutral-500">
          Descripción
        </p>
        <p className="text-sm text-neutral-800">{form.description}</p>
      </div>
      <div className="rounded-lg bg-secondary p-3">
        <p className="text-xs font-semibold uppercase text-neutral-500">
          Objetivo
        </p>
        <p className="text-sm text-neutral-800">{form.objective}</p>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">
          Preguntas ({form.questions.length})
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-neutral-600">
          {form.questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FormsPage;
