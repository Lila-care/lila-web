import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Admin/AdminLayout";
import { useDashboardStats } from "@/Admin/useDashboardStats";
import { RangeSelector } from "@/Admin/RangeSelector";
import RevenueSection from "@/Admin/RevenueSection";
import ActivitySection from "@/Admin/ActivitySection";
import TierSection from "@/Admin/TierSection";
import RecentUsersSection from "@/Admin/RecentUsersSection";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";

const SKELETON_SECTIONS = [
  { id: "revenue", title: "Ingresos" },
  { id: "activity", title: "Actividad" },
  { id: "recent-users", title: "Usuarias recientes" },
];

// Figma loading frames (314:754 / 314:1472): section titles stay, rows become flat lines.
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-12" data-testid="dashboard-loading">
      {SKELETON_SECTIONS.map(({ id, title }) => (
        <div key={id} className="flex flex-col gap-2">
          <SectionTitle id={`skeleton-${id}`} title={title} />
          <LedgerSkeleton rows={3} />
        </div>
      ))}
    </div>
  );
}

// Announces only on a range-change refetch, never on the very first mount (that would be
// redundant noise for screen reader users who just landed on the page).
function useRangeAnnouncement(rangeDays: number | undefined) {
  const [announcement, setAnnouncement] = useState("");
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (rangeDays === undefined) return;
    if (hasLoadedOnceRef.current) {
      setAnnouncement(`Mostrando datos de los últimos ${rangeDays} días.`);
    }
    hasLoadedOnceRef.current = true;
  }, [rangeDays]);

  return announcement;
}

function DashboardPage() {
  const {
    stats,
    days,
    setDays,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
  } = useDashboardStats();
  const announcement = useRangeAnnouncement(stats?.range.days);
  const hasError = !isInitialLoading && !!error;

  return (
    <AdminLayout navTone={hasError ? "neutral" : "default"}>
      <div
        className="flex min-h-full flex-col gap-12 px-4 pt-6 pb-10 md:px-8 md:pt-8 lg:pt-10 lg:pr-10 lg:pb-16 lg:pl-16"
        data-testid="dashboard-page"
      >
        <header className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="type-h4-strong text-text-primary">Dashboard</h1>
          <RangeSelector
            value={days}
            onChange={setDays}
            disabled={isInitialLoading}
            loading={isRefetching}
          />
        </header>

        <div
          aria-live="polite"
          className="sr-only"
          data-testid="dashboard-live-region"
        >
          {announcement}
        </div>

        {isInitialLoading && <DashboardSkeleton />}

        {hasError && (
          <LedgerError
            message="No pudimos cargar el dashboard."
            detail={error ?? undefined}
            onRetry={refetch}
            testId="dashboard-error"
          />
        )}

        {/* Content stays at full opacity during a range refetch — the RangeSelector caption
            ("Actualizando…") is the only refetch signal (Ledger spec). Revenue/tier are global
            counts the BE doesn't scope by `days`, so they render whenever stats loaded, even
            if the range itself had no activity. */}
        {!isInitialLoading && !error && stats && (
          <div className="flex flex-col gap-12" data-testid="dashboard-content">
            <RevenueSection subscriptions={stats.subscriptions} />
            <div className="flex min-w-0 flex-col gap-12 pt-4 xl:flex-row xl:gap-20">
              <div className="min-w-0 flex-1 xl:max-w-180">
                <ActivitySection stats={stats} />
              </div>
              <div className="min-w-0 md:max-w-79 xl:w-79 xl:shrink-0">
                <TierSection profileTiers={stats.profileTiers} />
              </div>
            </div>
            <RecentUsersSection />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default DashboardPage;
