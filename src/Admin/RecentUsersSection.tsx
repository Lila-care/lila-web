import { Link } from "wouter";
import { useRecentUsers } from "@/Admin/useRecentUsers";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { UsersList } from "@/Admin/ledger/UsersList";

const RECENT_USERS_LIMIT = 8;

interface RecentUsersSectionProps {
  hrefFor: (userId: string) => string;
  selectedUserId?: string | null;
}

// Fetches on its own (independent of the stats range): the list is "latest activity",
// not something scoped to 7/30/90 days.
function RecentUsersSection({ hrefFor, selectedUserId }: RecentUsersSectionProps) {
  const { data, loading, error, refetch } = useRecentUsers(RECENT_USERS_LIMIT);

  return (
    <section
      aria-labelledby="recent-users-section-title"
      data-testid="recent-users-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle
        id="recent-users-section-title"
        title="Usuarias recientes"
        action={
          <Link
            href="/admin/users"
            className="type-caption-medium shrink-0 rounded-xs focus-visible:outline-2 focus-visible:outline-teal-700"
            data-testid="recent-users-view-all"
          >
            <span className="text-teal-700">Ver todas las usuarias ›</span>
          </Link>
        }
      />

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
        <UsersList
          users={data.slice(0, RECENT_USERS_LIMIT)}
          hrefFor={hrefFor}
          rowTestId="recent-user-row"
          selectedUserId={selectedUserId}
        />
      )}
    </section>
  );
}

export default RecentUsersSection;
