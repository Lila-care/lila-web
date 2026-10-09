import { Button } from "@lila-care/design-system";
import { useUsers } from "@/Admin/useUsers";
import { useSelectedUser, useUsersFilters } from "@/Admin/useAdminUrl";
import { hasActiveFilters } from "@/Admin/usersFilters";
import { UsersFilterBar } from "@/Admin/UsersFilterBar";
import { UsersList } from "@/Admin/ledger/UsersList";
import { UsersListSkeleton } from "@/Admin/ledger/UsersListSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { LedgerEmptyState } from "@/Admin/ledger/LedgerEmptyState";
import { formatCount } from "@/Admin/dashboardFormat";
import type { UsersSortKey } from "@/api/users";

function describeTotal(total: number): string {
  return total === 1 ? "1 usuaria" : `${formatCount(total)} usuarias`;
}

// The "Usuarias" tab: URL-driven filters + list in the 4 states (loading, error, empty /
// no results, success). A row click opens the detail panel through `?user=`.
export function UsersListSection() {
  const { filters, setFilters, clearFilters } = useUsersFilters();
  const { hrefFor, userId } = useSelectedUser();
  const { data, total, totalPages, loading, error, refetch } = useUsers(filters);
  const filtered = hasActiveFilters(filters);

  // Same column again flips the direction; a new column starts descending (counts, dates) —
  // except email, where A→Z is the natural first click.
  const handleSort = (key: UsersSortKey) =>
    setFilters(
      filters.sort === key
        ? { order: filters.order === "asc" ? "desc" : "asc" }
        : { sort: key, order: key === "email" ? "asc" : "desc" },
    );

  const showEmpty = !loading && !error && total === 0;

  return (
    <div className="flex flex-col gap-6" data-testid="users-list-section">
      <UsersFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <p
        className="type-body-sm min-h-4.5 text-text-secondary"
        aria-live="polite"
        data-testid="users-count"
      >
        {!loading && !error && total > 0 && describeTotal(total)}
        {showEmpty && filtered && "Sin resultados"}
        {!loading && !error && total > 0 && filters.activeInRange && " activas en el rango"}
      </p>

      {loading && <UsersListSkeleton rows={8} testId="users-loading" />}

      {!loading && error && (
        <LedgerError message={error} onRetry={refetch} testId="users-error" />
      )}

      {showEmpty && filtered && (
        <LedgerEmptyState
          testId="users-no-results"
          title="Sin resultados"
          description="Ninguna usuaria coincide con los filtros aplicados."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="type-body-md rounded-xs text-teal-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-teal-700"
              data-testid="users-no-results-clear"
            >
              Limpiar filtros
            </button>
          }
        />
      )}

      {showEmpty && !filtered && (
        <LedgerEmptyState
          testId="users-empty"
          title="Todavía no hay usuarias"
          description="Cuando alguien cree una cuenta en Lila, va a aparecer acá."
        />
      )}

      {!loading && !error && data.length > 0 && (
        <UsersList
          users={data}
          hrefFor={hrefFor}
          sortState={{ sort: filters.sort, order: filters.order, onSort: handleSort }}
          listTestId="users-list"
          selectedUserId={userId}
        />
      )}

      {!loading && !error && totalPages > 1 && (
        <nav
          aria-label="Paginación"
          className="flex items-center justify-center gap-4"
          data-testid="users-pagination"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ page: filters.page - 1 })}
            className="rounded-sm border-border-strong"
            data-testid="users-prev-page"
          >
            Anterior
          </Button>
          <span className="type-body-sm text-text-secondary">
            Página {filters.page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters({ page: filters.page + 1 })}
            className="rounded-sm border-border-strong"
            data-testid="users-next-page"
          >
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
