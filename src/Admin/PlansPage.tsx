import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CreditCard, Plus } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { usePlans } from "@/Admin/usePlans";
import { usePlanEditor } from "@/Admin/usePlanEditor";
import { PlansTable } from "@/Admin/PlansTable";
import { PlanEditor } from "@/Admin/PlanEditor";
import { PlanStatusBadge } from "@/Admin/PlanStatusBadge";
import { PlanDto, UpdatePlanPayload } from "@/api/plans";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; plan: PlanDto };

const TABLE_COLUMN_HEADERS = ["Nombre", "Precio", "Intervalo", "Estado"];
const SKELETON_ROW_WIDTHS = ["w-32", "w-24", "w-16", "w-20"];

function TableLoadingSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm"
      data-testid="plans-loading"
    >
      <Table aria-label="Cargando planes">
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
          {Array.from({ length: 3 }).map((_, rowIndex) => (
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

function PlansPage() {
  const { plans, loading, error, refetch } = usePlans();
  const [view, setView] = useState<ViewMode>({ kind: "list" });
  const editor = usePlanEditor();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Reorients screen reader users to the top of the page whenever the view switches between
  // list/create/detail, since the content below the H1 changes completely (mirrors FormsPage).
  useEffect(() => {
    headingRef.current?.focus();
  }, [view.kind]);

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-neutral-50 px-10 py-8"
        data-testid="plans-page"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-semibold text-neutral-900 outline-none"
              >
                Planes
              </h1>
              <p className="text-sm text-neutral-600">
                Administrá los planes de suscripción de Lila Premium.
              </p>
            </div>
            {view.kind === "list" && (
              <Button
                variant="cta"
                onClick={() => setView({ kind: "create" })}
                data-testid="plans-create-button"
              >
                <Plus className="size-4" aria-hidden="true" />
                Nuevo plan
              </Button>
            )}
            {view.kind !== "list" && (
              <Button
                variant="ghost"
                onClick={() => setView({ kind: "list" })}
                data-testid="plans-back-button"
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
                plans={plans}
                onSelect={(plan) => setView({ kind: "detail", plan })}
                onRetry={refetch}
                onCreate={() => setView({ kind: "create" })}
              />
            )}

            {view.kind === "create" && (
              <PlanEditor
                saving={editor.saving}
                saveError={editor.saveError}
                onCreate={async (payload) => {
                  const created = await editor.create(payload);
                  if (created) {
                    refetch();
                    setView({ kind: "list" });
                  }
                }}
                onUpdate={() => {}}
                onCancel={() => setView({ kind: "list" })}
              />
            )}

            {view.kind === "detail" && (
              <DetailSection
                plan={view.plan}
                saving={editor.saving}
                saveError={editor.saveError}
                onUpdate={async (payload) => {
                  const updated = await editor.update(
                    view.plan.planId,
                    payload,
                  );
                  if (updated) {
                    refetch();
                    setView({ kind: "detail", plan: updated });
                  }
                }}
                onCancel={() => setView({ kind: "list" })}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface ListSectionProps {
  loading: boolean;
  error: string | null;
  plans: PlanDto[];
  onSelect: (plan: PlanDto) => void;
  onRetry: () => void;
  onCreate: () => void;
}

function ListSection({
  loading,
  error,
  plans,
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
        data-testid="plans-error"
      >
        <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
        <AlertDescription className="text-red-700">
          <p>Error al cargar los planes: {error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-16 text-center"
        data-testid="plans-empty"
      >
        <CreditCard
          className="mx-auto mb-3 size-12 text-neutral-400"
          aria-hidden="true"
        />
        <p className="mb-1 text-sm font-medium text-neutral-700">
          Todavía no hay planes creados.
        </p>
        <p className="mb-4 text-sm text-neutral-500">
          Usa &quot;Nuevo plan&quot; para crear el primero.
        </p>
        <Button onClick={onCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo plan
        </Button>
      </div>
    );
  }

  return (
    <PlansTable
      data={plans}
      onSelectPlan={(planId) => {
        const plan = plans.find((p) => p.planId === planId);
        if (plan) onSelect(plan);
      }}
    />
  );
}

interface DetailSectionProps {
  plan: PlanDto;
  saving: boolean;
  saveError: string | null;
  onUpdate: (payload: UpdatePlanPayload) => void;
  onCancel: () => void;
}

function DetailSection({
  plan,
  saving,
  saveError,
  onUpdate,
  onCancel,
}: DetailSectionProps) {
  return (
    <div className="space-y-6" data-testid="plan-detail">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-neutral-900">
          {plan.name}
        </h2>
        <PlanStatusBadge status={plan.status} />
      </div>
      <PlanEditor
        initialPlan={plan}
        saving={saving}
        saveError={saveError}
        onCreate={() => {}}
        onUpdate={onUpdate}
        onCancel={onCancel}
      />
    </div>
  );
}

export default PlansPage;
