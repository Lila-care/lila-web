import { useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { DashboardUserListItemDto } from "@/api/users";
import { formatCount, formatRelativeDate } from "@/Admin/dashboardFormat";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { RECENT_USERS_COLUMNS } from "@/Admin/ledger/ledgerColumns";

type SortKey = "conversations" | "cycleReports";

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, sortKey, activeKey, onSort }: SortHeaderProps) {
  const isActive = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-pressed={isActive}
      className="flex items-center justify-end gap-1 text-right hover:text-text-primary"
      data-testid={`recent-users-sort-${sortKey}`}
    >
      {isActive && <ArrowDown className="size-3" aria-hidden="true" />}
      {label}
    </button>
  );
}

function RecentUserRow({ user }: { user: DashboardUserListItemDto }) {
  return (
    <li
      className={`grid ${RECENT_USERS_COLUMNS} items-center gap-x-3 border-b border-border-default py-2 lg:h-8 lg:gap-x-0 lg:py-0`}
      data-testid="recent-user-row"
    >
      <span
        className={`type-body-md col-span-3 min-w-0 truncate lg:col-span-1 ${
          user.email ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {user.email ?? "Sin email"}
      </span>
      <span className="type-body-sm lg:type-body-md tabular-nums text-text-secondary lg:text-right lg:text-text-primary">
        {formatCount(user.conversations)}
        <span className="lg:hidden"> conversaciones</span>
      </span>
      <span className="type-body-sm lg:type-body-md tabular-nums text-text-secondary lg:text-right lg:text-text-primary">
        {formatCount(user.cycleReports)}
        <span className="lg:hidden"> reportes</span>
      </span>
      <span className="type-body-sm text-right text-text-secondary">
        {formatRelativeDate(user.lastActivityAt)}
      </span>
    </li>
  );
}

export function RecentUsersLedger({
  users,
}: {
  users: DashboardUserListItemDto[];
}) {
  // null = BE order (lastActivityAt desc). Sorting is always descending: the question an admin
  // asks here is "who uses Lila the most", never "the least".
  const [sortKey, setSortKey] = useState<SortKey | null>(null);

  const sortedUsers = useMemo(
    () =>
      sortKey
        ? [...users].sort((a, b) => b[sortKey] - a[sortKey])
        : users,
    [users, sortKey],
  );

  const toggleSort = (key: SortKey) =>
    setSortKey((current) => (current === key ? null : key));

  return (
    <div className="min-w-0">
      <LedgerHeader className={`hidden lg:grid ${RECENT_USERS_COLUMNS}`}>
        <span>Email</span>
        <SortHeader
          label="Conversaciones"
          sortKey="conversations"
          activeKey={sortKey}
          onSort={toggleSort}
        />
        <SortHeader
          label="Reportes de ciclo"
          sortKey="cycleReports"
          activeKey={sortKey}
          onSort={toggleSort}
        />
        <span className="text-right">Última actividad</span>
      </LedgerHeader>
      <ul>
        {sortedUsers.map((user) => (
          <RecentUserRow key={user.userId} user={user} />
        ))}
      </ul>
    </div>
  );
}
