import { useRecentUsers } from "@/Admin/useRecentUsers";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { RecentUsersLedger } from "@/Admin/ledger/RecentUsersLedger";

const RECENT_USERS_LIMIT = 10;

// Fetches on its own (independent of the stats range): the list is "latest activity",
// not something scoped to 7/30/90 days.
function RecentUsersSection() {
  const { data, loading, error, refetch } = useRecentUsers(RECENT_USERS_LIMIT);

  return (
    <section
      aria-labelledby="recent-users-section-title"
      data-testid="recent-users-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle id="recent-users-section-title" title="Usuarias recientes" />

      {loading && <LedgerSkeleton rows={4} testId="recent-users-loading" />}

      {!loading && error && (
        <LedgerError
          message="No pudimos cargar las usuarias recientes."
          detail={error}
          onRetry={refetch}
          testId="recent-users-error"
        />
      )}

      {!loading && !error && data.length === 0 && (
        <p
          className="type-body-sm py-2 text-text-secondary"
          data-testid="recent-users-empty"
        >
          Todavía no hay usuarias con actividad reciente.
        </p>
      )}

      {!loading && !error && data.length > 0 && (
        <RecentUsersLedger users={data.slice(0, RECENT_USERS_LIMIT)} />
      )}
    </section>
  );
}

export default RecentUsersSection;
