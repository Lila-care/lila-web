import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { PackageSearch } from "lucide-react";
import { Banner, Button, Skeleton, cn } from "@lila-care/design-system";

// The package's Skeleton defaults to the yellow `bg-accent`, off-brand on lilac surfaces.
function SkeletonBlock({ className }: { className: string }) {
  return (
    <Skeleton
      className={cn("bg-surface-muted motion-reduce:animate-none", className)}
    />
  );
}

// Same silhouette as the ready state so the page doesn't jump when the plan arrives.
export function CheckoutSkeleton() {
  return (
    <div
      data-testid="checkout-skeleton"
      aria-hidden="true"
      className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start"
    >
      <div className="flex flex-col gap-5 rounded-2xl border border-border-default bg-surface-default p-6">
        <SkeletonBlock className="h-6 w-40" />
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
        <SkeletonBlock className="h-12 w-full" />
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5 rounded-2xl border border-border-default bg-surface-default p-6">
        <SkeletonBlock className="h-10 w-32" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}

export function PlanLoadError({ onRetry }: { onRetry: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      data-testid="plan-error"
      className="flex flex-col items-start gap-4 outline-none"
    >
      <Banner
        variant="error"
        title="No pudimos cargar tu plan"
        message="Revisa tu conexión e inténtalo de nuevo."
        className="w-full"
      />
      <Button size="lg" className="h-12 rounded-[12px]!" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function PlanNotFound() {
  return (
    <div
      data-testid="plan-empty"
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-default bg-surface-default p-8 text-center"
    >
      <PackageSearch
        className="size-12 text-brand-primary"
        aria-hidden="true"
      />
      <h2 className="text-lg font-semibold text-text-primary">
        No encontramos este plan
      </h2>
      <p className="text-sm text-text-secondary">
        Puede que ya no esté disponible. Vuelve al chat e inténtalo de nuevo.
      </p>
      <Button asChild size="lg" className="h-12 rounded-[12px]!">
        <Link href="/chat">Volver al chat</Link>
      </Button>
    </div>
  );
}
