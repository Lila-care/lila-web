import { useState } from "react";
import { AlertCircle, DollarSign, UserCheck, UserX, Users } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useSubscribers, useSubscriptionStats } from "@/Admin/useSubscribers";
import { SubscribersTable } from "@/Admin/SubscribersTable";
import { SubscriptionStatus } from "@/api/subscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCOP(amountInCents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

type StatusFilterValue = SubscriptionStatus | "all";

const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activa" },
  { value: "past_due", label: "Vencida" },
  { value: "canceled", label: "Cancelada" },
];

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600">
          {label}
        </CardTitle>
        <Icon className="size-4 text-neutral-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatsSection() {
  const { stats, loading, error, refetch } = useSubscriptionStats();

  if (loading) {
    return (
      <div
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="stats-loading"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="mb-6 rounded-xl border-red-200 bg-red-50 p-4"
        aria-live="polite"
        data-testid="stats-error"
      >
        <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
        <AlertDescription className="text-red-700">
          <p>Error al cargar las estadísticas: {error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Guard both "not loaded yet" and a loaded-but-empty-shaped response — same empty-state
  // pattern this codebase's memory flags as a recurring bug (don't assume `stats` is always set).
  if (!stats) return null;

  return (
    <div
      className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="stats-grid"
    >
      <StatCard
        icon={Users}
        label="Total suscriptoras"
        value={String(stats.totalSubscribers)}
        testId="stat-total"
      />
      <StatCard
        icon={UserCheck}
        label="Activas"
        value={String(stats.byStatus.active)}
        testId="stat-active"
      />
      <StatCard
        icon={UserX}
        label="Vencidas"
        value={String(stats.byStatus.past_due)}
        testId="stat-past-due"
      />
      <StatCard
        icon={DollarSign}
        label="MRR"
        value={formatCOP(stats.mrrInCents)}
        testId="stat-mrr"
      />
    </div>
  );
}

function SubscribersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const { items, loading, error, hasMore, loadMore, refetch } = useSubscribers({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-neutral-50 px-10 py-8"
        data-testid="subscribers-page"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Suscriptoras
            </h1>
            <p className="text-sm text-neutral-600">
              Seguimiento de suscripciones a Lila Premium.
            </p>
          </div>

          <StatsSection />

          <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-neutral-900">
                Suscriptoras
              </h2>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
              >
                <SelectTrigger
                  className="w-44"
                  data-testid="subscribers-status-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && items.length === 0 && (
              <div className="space-y-2" data-testid="subscribers-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}

            {error && (
              <Alert
                variant="destructive"
                className="rounded-xl border-red-200 bg-red-50 p-4"
                aria-live="polite"
                data-testid="subscribers-error"
              >
                <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
                <AlertDescription className="text-red-700">
                  <p>Error al cargar las suscriptoras: {error}</p>
                  <Button variant="outline" size="sm" onClick={refetch}>
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!loading && !error && items.length === 0 && (
              <div
                className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-16 text-center"
                data-testid="subscribers-empty"
              >
                <Users
                  className="mx-auto mb-3 size-12 text-neutral-400"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-neutral-700">
                  Todavía no hay suscriptoras.
                </p>
                <p className="text-sm text-neutral-500">
                  Cuando alguien se suscriba a Lila Premium, va a aparecer acá.
                </p>
              </div>
            )}

            {items.length > 0 && (
              <>
                <SubscribersTable data={items} />
                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                      data-testid="subscribers-load-more"
                    >
                      {loading ? "Cargando..." : "Cargar más"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default SubscribersPage;
