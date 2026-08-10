import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useUsers } from "@/Admin/useUsers";
import { UsersTable } from "@/Admin/UsersTable";
import UserDetails from "@/Admin/UserDetails";
import {
  getTemplate,
  updateTemplate,
  LilaTemplate,
  UpdateTemplateDto,
} from "@/api/lila";
import { useAuth } from "@/auth/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// --- Template tab ---

function TemplateSection() {
  const { token } = useAuth();

  const [template, setTemplate] = useState<LilaTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [form, setForm] = useState<UpdateTemplateDto>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingTemplate(true);
    getTemplate(token)
      .then((t) => {
        setTemplate(t);
        setForm({
          name: t.name,
          systemPrompt: t.systemPrompt,
          defaultModel: t.defaultModel,
          freeQuestionLimit: t.freeQuestionLimit,
          isActive: t.isActive,
        });
      })
      .catch((e) =>
        setTemplateError(
          e instanceof Error ? e.message : "Error al cargar el template",
        ),
      )
      .finally(() => setLoadingTemplate(false));
  }, [token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? Number(value)
          : type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
  };

  const handleToggle = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateTemplate(token, form);
      setTemplate(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loadingTemplate) {
    return (
      <div className="p-10" data-testid="template-loading">
        <p className="text-gray-500">Cargando template...</p>
      </div>
    );
  }

  if (templateError) {
    return (
      <div className="p-10" data-testid="template-error">
        <p className="text-red-600">
          Error al cargar el template: {templateError}
        </p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-10" data-testid="template-empty">
        <p className="text-gray-400">No hay template configurado.</p>
      </div>
    );
  }

  return (
    <div className="p-10" data-testid="template-section">
      <h2 className="text-2xl font-semibold mb-2">Template</h2>
      <p className="text-gray-400 text-sm mb-6">
        Versión actual:{" "}
        <span className="font-medium text-gray-700">v{template.version}</span>
        {" · "}Última actualización:{" "}
        {new Date(template.updatedAt).toLocaleString("es-VE")}
      </p>

      <form
        onSubmit={handleSave}
        className="space-y-5 max-w-xl"
        data-testid="template-form"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            name="name"
            value={form.name ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="template-name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt
          </label>
          <textarea
            name="systemPrompt"
            value={form.systemPrompt ?? ""}
            onChange={handleChange}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            data-testid="template-system-prompt"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo por defecto
          </label>
          <input
            type="text"
            name="defaultModel"
            value={form.defaultModel ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="template-default-model"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Límite de preguntas gratuitas
          </label>
          <input
            type="number"
            name="freeQuestionLimit"
            value={form.freeQuestionLimit ?? 0}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="template-free-question-limit"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.isActive ? "bg-primary" : "bg-gray-300"
            }`}
            data-testid="template-is-active"
            aria-pressed={form.isActive}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <label className="text-sm font-medium text-gray-700">
            {form.isActive ? "Activo" : "Inactivo"}
          </label>
        </div>

        {saveError && (
          <p className="text-red-600 text-sm" data-testid="template-save-error">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p
            className="text-green-600 text-sm"
            data-testid="template-save-success"
          >
            Template guardado correctamente.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          data-testid="template-save-button"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}

// --- Users Activity tab ---

function UsersActivitySection() {
  const { data, page, setPage, totalPages, loading, error, refetch } =
    useUsers();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <div className="flex">
      <div className="flex-1 p-10">
        {loading && data.length === 0 && (
          <div className="space-y-2" data-testid="users-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-200 bg-red-50 p-4"
            aria-live="polite"
            data-testid="users-error"
          >
            <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
            <AlertDescription className="text-red-700">
              <p>Error al cargar las usuarias: {error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!error && (loading === false || data.length > 0) && (
          <>
            <UsersTable data={data} onSelectUser={setSelectedUser} />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-testid="users-prev-page"
                >
                  Anterior
                </Button>
                <span className="text-sm text-neutral-600">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="users-next-page"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <div className="w-[380px] border-l bg-white">
          <UserDetails
            userId={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        </div>
      )}
    </div>
  );
}

// --- Page ---

function UsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "template">("users");

  return (
    <AdminLayout>
      <div className="min-h-full bg-white" data-testid="users-page">
        <div className="flex border-b border-gray-200 px-10 pt-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`mr-6 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            data-testid="tab-users"
          >
            Users Activity
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "template"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            data-testid="tab-template"
          >
            Template
          </button>
        </div>

        {activeTab === "users" && <UsersActivitySection />}
        {activeTab === "template" && <TemplateSection />}
      </div>
    </AdminLayout>
  );
}

export default UsersPage;
