import type { ReactNode } from "react";
import { AlertCircle, BadgePercent, SearchX } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Skeleton,
} from "@lila-care/design-system";

export function DiscountsSkeleton() {
  return (
    <div data-testid="discounts-loading">
      <p role="status" className="sr-only">
        Cargando descuentos…
      </p>
      <div className="hidden flex-col gap-2 lg:flex">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="gap-3 p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DiscountsErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert
      variant="destructive"
      aria-live="polite"
      data-testid="discounts-error"
      className="rounded-xl border-red-200 bg-red-50 p-4"
    >
      <AlertCircle aria-hidden="true" />
      <AlertDescription className="flex flex-col gap-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 break-words">
          Error al cargar los descuentos: {message}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          data-testid="discounts-retry"
        >
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface EmptyStateProps {
  testId: string;
  icon: ReactNode;
  title: string;
  description?: string;
  action: ReactNode;
}

function EmptyState({
  testId,
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-secondary px-4 py-16 text-center"
    >
      {icon}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description && <p className="text-sm text-neutral-600">{description}</p>}
      <div className="mt-2">{action}</div>
    </div>
  );
}

export function NoDiscountsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      testId="discounts-empty"
      icon={
        <BadgePercent className="size-12 text-neutral-400" aria-hidden="true" />
      }
      title="Todavía no hay descuentos."
      description="Crea el primero para ofrecer un precio especial en un plan."
      action={
        <Button type="button" onClick={onCreate}>
          Nuevo descuento
        </Button>
      }
    />
  );
}

export function NoResultsEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      testId="discounts-empty-filtered"
      icon={<SearchX className="size-12 text-neutral-400" aria-hidden="true" />}
      title="Ningún descuento coincide con los filtros."
      action={
        <Button type="button" variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      }
    />
  );
}
